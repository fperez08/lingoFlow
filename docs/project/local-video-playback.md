# Local Video Playback Foundation

> Relevant to: **Issue #138 — Local video playback foundation**
>
> Covers the data model migration, filesystem storage, streaming API route, and player changes
> needed to support locally-stored video files alongside the existing YouTube path.

---

## 1. Overview

The current codebase supports YouTube-only lessons: a record stores `youtube_url` / `youtube_id`
and the player renders a YouTube IFrame embed. This feature adds a parallel **local-video** path:

- A video file is uploaded and stored on the local filesystem in `.lingoflow-data/videos/`.
- The DB record carries a `source_type` discriminator plus local-file metadata.
- A streaming API route serves the file with proper `Content-Type` and `Range` support.
- The player detects `source_type` and renders an HTML5 `<video>` instead of the YouTube embed.
- Transcript loading and cue-synced playback are unchanged.

---

## 2. Data Model Changes

### 2.1 New columns

Three columns are added to the `videos` table. All have defaults so existing YouTube records
require no migration data:

| Column | Type | Default | Description |
|---|---|---|---|
| `source_type` | `TEXT` | `'youtube'` | `'youtube'` or `'local'` |
| `local_video_path` | `TEXT` | `NULL` | Absolute path on disk, e.g. `.lingoflow-data/videos/<id>.mp4` |
| `local_video_filename` | `TEXT` | `NULL` | Original filename as uploaded, e.g. `lesson.mp4` |

### 2.2 Migration strategy

Use `ALTER TABLE … ADD COLUMN` (SQLite supports this without rebuilding the table).
Run once at startup inside `initializeSchema` so the app self-migrates:

```sql
ALTER TABLE videos ADD COLUMN source_type TEXT NOT NULL DEFAULT 'youtube';
ALTER TABLE videos ADD COLUMN local_video_path TEXT;
ALTER TABLE videos ADD COLUMN local_video_filename TEXT;
```

Wrap each statement in a try/catch (or check `pragma table_info`) to tolerate re-runs —
SQLite returns an error if the column already exists.

Canonical place: **`src/lib/db.ts`** — `initializeSchema()`.

### 2.3 Updated Zod schema (`src/lib/videos.ts`)

```ts
export const VideoSchema = z.object({
  // existing fields …
  source_type: z.enum(['youtube', 'local']).default('youtube'),
  local_video_path: z.string().nullable().default(null),
  local_video_filename: z.string().nullable().default(null),
})
```

`InsertVideoParamsSchema` and `UpdateVideoParamsSchema` gain the same optional fields.

### 2.4 Updated `VideoRow` interface (`src/lib/video-store.ts`)

```ts
interface VideoRow {
  // existing fields …
  source_type: string
  local_video_path: string | null
  local_video_filename: string | null
}
```

`rowToVideo` maps them straight through (no extra deserialization needed).

---

## 3. File Storage

### Layout

```
.lingoflow-data/
  lingoflow.db
  transcripts/      ← existing
  videos/           ← NEW — local video files
    <id>.<ext>      ← original extension preserved, nanoid as stem
```

### Naming convention

Use the record's `id` (nanoid) as the filename stem and preserve the original file extension:

```ts
const filename = `${id}${ext}` // e.g. "V3lNk8Qa.mp4"
const fullPath = path.join(dataDir, 'videos', filename)
```

Store `fullPath` in `local_video_path` and the user's original filename in `local_video_filename`.

### `ensureDataDirs` update (`src/lib/db.ts`)

```ts
export function ensureDataDirs(dataDir: string): void {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.mkdirSync(path.join(dataDir, 'transcripts'), { recursive: true })
  fs.mkdirSync(path.join(dataDir, 'videos'), { recursive: true })   // ← add
}
```

### `VideoService` — new `importLocalVideo` method

```ts
async importLocalVideo(params: ImportLocalVideoParams): Promise<Video> {
  // 1. write video file
  // 2. write transcript file
  // 3. insert DB record with source_type = 'local'
  // 4. roll back files on DB insert failure
}
```

Mirror the error-rollback pattern already used in `importVideo`.

---

## 4. Streaming API Route

### Route

```
GET /api/videos/[id]/stream
```

**File:** `src/app/api/videos/[id]/stream/route.ts`

### Responsibilities

1. Look up the record by `id`; return `404` if not found or `source_type !== 'local'`.
2. Verify `local_video_path` exists on disk; return `404` if missing.
3. Read the `Range` request header; serve a **partial response (206)** when present, full response (200) otherwise.
4. Set `Content-Type` from the file extension (or stored MIME type).
5. Set `Accept-Ranges: bytes` so the browser knows seeking is supported.

### Minimal implementation sketch

```ts
export const runtime = 'nodejs'

import fs from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { videoStore } from '@/lib/server/composition'
import { lookup } from 'mime-types' // or a simple extension map

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const video = videoStore.getById(id)

  if (!video || video.source_type !== 'local' || !video.local_video_path) {
    return new NextResponse('Not found', { status: 404 })
  }

  const filePath = video.local_video_path
  if (!fs.existsSync(filePath)) {
    return new NextResponse('File not found on disk', { status: 404 })
  }

  const stat = fs.statSync(filePath)
  const fileSize = stat.size
  const mimeType = lookup(path.extname(filePath)) || 'video/mp4'
  const rangeHeader = req.headers.get('range')

  if (rangeHeader) {
    // Parse "bytes=start-end"
    const [startStr, endStr] = rangeHeader.replace('bytes=', '').split('-')
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1
    const chunkSize = end - start + 1

    const stream = fs.createReadStream(filePath, { start, end })
    // Convert Node stream to Web ReadableStream
    const webStream = ReadableStream.from(stream)

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': mimeType,
      },
    })
  }

  // Full file
  const stream = fs.createReadStream(filePath)
  const webStream = ReadableStream.from(stream)
  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Length': String(fileSize),
      'Accept-Ranges': 'bytes',
      'Content-Type': mimeType,
    },
  })
}
```

> **Note:** `ReadableStream.from` is available in Node 18+. The repo targets Node 24, so this is safe.
> Always export `runtime = 'nodejs'` — `better-sqlite3` and `fs` cannot run in the Edge runtime.

---

## 5. Player Changes

### 5.1 `Video` type change

`source_type` drives the rendering decision:

```ts
if (video.source_type === 'local') {
  // render HTML5 <video>
} else {
  // render YouTube IFrame embed
}
```

### 5.2 HTML5 `<video>` element

```tsx
<video
  src={`/api/videos/${video.id}/stream`}
  controls
  className="w-full h-full"
  onTimeUpdate={(e) => {
    const currentTime = (e.currentTarget as HTMLVideoElement).currentTime
    onTimeUpdate(currentTime)
  }}
/>
```

- `src` points to the streaming route — the browser sends `Range` requests automatically.
- `controls` shows native browser controls (play/pause, seek bar, volume, fullscreen).
- `onTimeUpdate` fires frequently (~4 Hz by default); use it to drive active-cue detection
  the same way `getCurrentTime()` polling works for YouTube.

### 5.3 Cue-sync adaptation

The existing cue-sync logic polls `player.getCurrentTime()` on a 250 ms interval. For the
HTML5 video element, replace the interval with `onTimeUpdate`:

```ts
// YouTube path (existing) — polling
setInterval(() => {
  const t = playerRef.current?.getCurrentTime() ?? 0
  updateActiveCue(t)
}, 250)

// Local-video path (new) — event-driven
<video
  onTimeUpdate={(e) => updateActiveCue(e.currentTarget.currentTime)}
  ...
/>
```

`onTimeUpdate` typically fires at ~4 Hz, which is sufficient for 250 ms cue granularity.

### 5.4 Seek-on-cue-click

For the YouTube player, seeking uses `playerRef.current.seekTo(seconds, true)`.
For HTML5 video, use `videoRef.current.currentTime = seconds`:

```ts
function seekTo(seconds: number) {
  if (video.source_type === 'local') {
    if (videoRef.current) videoRef.current.currentTime = seconds
  } else {
    playerRef.current?.seekTo(seconds, true)
    playerRef.current?.playVideo()
  }
}
```

### 5.5 Component structure

`PlayerClient.tsx` is the main client component. The recommended change is to extract a
`LocalVideoPlayer` component and a `YouTubePlayer` component, then conditionally render:

```tsx
{video.source_type === 'local'
  ? <LocalVideoPlayer video={video} onTimeUpdate={updateActiveCue} seekRef={videoRef} />
  : <YouTubePlayer video={video} onReady={...} onStateChange={...} />
}
```

This keeps each player's concerns isolated and avoids a large conditional inside a single component.

---

## 6. Import Flow Changes

### 6.1 Import API route (`POST /api/videos/import`)

The existing import route handles only YouTube. For local video:

- Accept a `video` file field in `FormData` alongside the existing `transcript` file field.
- If `video` is present and `youtube_url` is absent (or set to a placeholder), treat the import
  as `source_type = 'local'`.
- Delegate to `videoService.importLocalVideo(...)`.

### 6.2 Import modal (`ImportVideoModal`)

Add a toggle or tab: **YouTube URL** vs **Local file**. In local-file mode:

- Show a file input for the video (`.mp4`, `.webm`, `.mkv`, etc.) instead of the YouTube URL field.
- Keep the existing transcript file input and tags field.
- `title` and `author_name` default to the video filename when no oEmbed metadata is available.

---

## 7. Affected Files Summary

| File | Change |
|---|---|
| `src/lib/db.ts` | `initializeSchema` — `ALTER TABLE` for new columns; `ensureDataDirs` — add `videos/` subdir |
| `src/lib/videos.ts` | `VideoSchema`, `InsertVideoParamsSchema`, `UpdateVideoParamsSchema` — add 3 new fields |
| `src/lib/video-store.ts` | `VideoRow` interface — add new fields; `rowToVideo` already safe (spread) |
| `src/lib/video-service.ts` | Add `importLocalVideo` method; optionally extend `deleteVideo` to unlink the video file |
| `src/lib/server/composition.ts` | Wire any new `LocalVideoStore` or extend existing store as needed |
| `src/app/api/videos/[id]/stream/route.ts` | **New** — streaming route with Range support |
| `src/app/api/videos/import/route.ts` | Handle local video upload path |
| `src/components/PlayerClient.tsx` | Conditional YouTube vs HTML5 rendering; cue-sync via `onTimeUpdate` |
| `src/components/ImportVideoModal.tsx` | Add local-file import mode |

---

## 8. Preserved Behaviors

- **Transcript loading** — `GET /api/videos/:id/transcript` is unchanged. Both YouTube and local
  lessons load the transcript the same way.
- **Cue-synced highlighting and paging** — the `parsedCues` / `findActiveCueBinary` / page logic
  in `docs/api/transcript-sync.md` is unchanged. Only the time source switches from a polling
  interval to `onTimeUpdate`.
- **Tags and metadata** — `PATCH /api/videos/:id` works identically for both source types.
- **Existing YouTube records** — `source_type` defaults to `'youtube'`; no data migration of
  existing rows is needed.

---

## 9. References

- Transcript sync patterns: [`docs/api/transcript-sync.md`](../api/transcript-sync.md)
- Player component architecture: [`docs/project/player-feature.md`](player-feature.md)
- YouTube IFrame API: [`docs/api/youtube-iframe-player.md`](../api/youtube-iframe-player.md)
- Composition root: `src/lib/server/composition.ts`
- Data directory helpers: `src/lib/db.ts` — `ensureDataDirs`, `initializeSchema`
- MDN `<video>` element: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video
- MDN `HTMLMediaElement.currentTime`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime
- MDN HTTP Range requests: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests
