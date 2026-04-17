# Issue #138 — Local Video Playback Foundation: Context & Patterns

## Current Architecture

### Data Model (`src/lib/`)

**SQLite schema** (`db.ts → initializeSchema`):
```sql
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  youtube_url TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL,
  author_name TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  transcript_path TEXT NOT NULL,
  transcript_format TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
```
All fields assume a YouTube video. `youtube_url` and `youtube_id` are NOT NULL.

**Zod schema** (`videos.ts`):  
`VideoSchema` / `InsertVideoParamsSchema` mirror the SQL columns 1-to-1. `tags` is `string[]` in the domain type but stored as a JSON string (`'["a","b"]'`) in SQLite. `SqliteVideoStore.rowToVideo()` deserializes via `JSON.parse(row.tags)`.

**`VideoStore` interface** (`video-store.ts`): `list`, `getById`, `insert`, `update`, `delete`. The `SqliteVideoStore` implementation uses `better-sqlite3` prepared statements directly.

**`VideoService`** (`video-service.ts`): Business logic layer. Handles transcript file I/O via an injected `TranscriptStore`. Routes always call `videoService` / `videoStore` from the composition root — never construct directly.

**Composition root** (`src/lib/server/composition.ts`):  
Single place that constructs `SqliteVideoStore` and `VideoService` and exports `videoStore` / `videoService`. All route handlers import from here.

**Transcript files** (`src/lib/transcripts.ts`):  
Stored under `<dataDir>/transcripts/<videoId>.<ext>` on the local filesystem. `dataDir` = `LINGOFLOW_DATA_DIR` env var, defaulting to `.lingoflow-data/`.

---

### Player Flow (YouTube today)

```
/player/[id]/page.tsx (Server Component, awaits params)
  └─ <PlayerLoader id={id} />          (client, fetches /api/videos/:id)
       └─ <PlayerClient video={video} /> (client, drives UI)
            ├─ fetches /api/videos/:id/transcript  → cues[]
            ├─ <LessonHero> with "Play Lesson" button
            ├─ <MiniPlayer youtubeId={...} />      (YouTube IFrame API, fixed bottom-right)
            └─ transcript pane with click-to-seek
```

**`MiniPlayer`** loads the YouTube IFrame API script dynamically, creates a `YT.Player` on mount, polls `getCurrentTime()` every 250 ms, and exposes `seekTo`. It is fully YouTube-specific.

**Transcript sync**: `PlayerClient` compares `playbackTime.current` against `cue.startTime/endTime` (parsed from `HH:MM:SS.mmm`) to track `activeCueIndex`. Clicking a cue sets `requestedSeekTime`, which `MiniPlayer` picks up via a `useEffect`.

---

## What Needs to Change for Issue #138

### 1. DB Schema Extension

Add new columns to `videos` table to distinguish source type and store a local file path:

```sql
ALTER TABLE videos ADD COLUMN source_type TEXT NOT NULL DEFAULT 'youtube';
ALTER TABLE videos ADD COLUMN local_video_path TEXT;
```

- `source_type`: `'youtube'` | `'local'`
- `local_video_path`: absolute filesystem path to the video file (NULL for YouTube records)
- `youtube_url` / `youtube_id` should be made nullable (or accept empty string) for local records

**Migration pattern**: `initializeSchema` uses `CREATE TABLE IF NOT EXISTS`, so it won't re-run DDL on existing DBs. Add migration using `ALTER TABLE … ADD COLUMN IF NOT EXISTS` (SQLite 3.35+) or wrap in `try/catch` for idempotency:
```ts
try { db.exec(`ALTER TABLE videos ADD COLUMN source_type TEXT NOT NULL DEFAULT 'youtube'`) } catch {}
try { db.exec(`ALTER TABLE videos ADD COLUMN local_video_path TEXT`) } catch {}
```
Call this migration from `initializeSchema` after the `CREATE TABLE`.

### 2. Zod / TypeScript Type Updates

Update `VideoSchema` and `InsertVideoParamsSchema` in `src/lib/videos.ts`:
```ts
source_type: z.enum(['youtube', 'local']).default('youtube'),
local_video_path: z.string().nullable().optional(),
// make youtube fields optional for local videos:
youtube_url: z.string().default(''),
youtube_id: z.string().default(''),
```

Update `VideoRow` interface in `video-store.ts` to include the new columns. Update `rowToVideo` accordingly.

### 3. Video Streaming Route

New route: `GET /api/videos/[id]/stream`  
File: `src/app/api/videos/[id]/stream/route.ts`

**Critical requirements**:
- Must export `export const runtime = 'nodejs'` (better-sqlite3 + Node.js `fs`)
- Must await `params`: `const { id } = await params`
- Must support HTTP `Range` requests for browser seek support (HTML5 `<video>` sends `Range: bytes=X-Y`)

**Pattern**:
```ts
export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const video = videoStore.getById(id)
  if (!video || video.source_type !== 'local' || !video.local_video_path) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const filePath = video.local_video_path
  const stat = fs.statSync(filePath)          // get file size
  const fileSize = stat.size
  const rangeHeader = request.headers.get('range')

  if (rangeHeader) {
    // Parse "bytes=start-end"
    const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-')
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1
    const chunkSize = end - start + 1

    const stream = fs.createReadStream(filePath, { start, end })
    const webStream = Readable.toWeb(stream) as ReadableStream

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': 'video/mp4',
      },
    })
  }

  // Full file (no Range header)
  const stream = fs.createReadStream(filePath)
  const webStream = Readable.toWeb(stream) as ReadableStream
  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Length': String(fileSize),
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    },
  })
}
```

**Import needed**: `import { Readable } from 'stream'` — converts Node.js `ReadableStream` to Web Streams API `ReadableStream` that `NextResponse` accepts.

**Content-Type**: Serve `video/mp4` as the baseline. Optionally detect from file extension.

### 4. HTML5 Video Player Component

New component: `src/components/LocalVideoPlayer.tsx`

Replaces `MiniPlayer` for local videos. Key design:
- Uses `<video>` element with `src={/api/videos/${videoId}/stream}`
- Uses a `ref` to the `<video>` element to expose `currentTime` / `duration` and imperative `seekTo`
- Emits `onTimeUpdate(current, duration)` via `ontimeupdate` event (or polling if needed)
- Supports `seekToTime` prop (same interface as `MiniPlayer`) via `useEffect` + `videoRef.current.currentTime = seekToTime`
- Same fixed-position overlay layout as `MiniPlayer` for UI consistency

**Interface** (mirror `MiniPlayerProps` minus `youtubeId`, add `videoId`):
```ts
interface LocalVideoPlayerProps {
  videoId: string
  title: string
  onClose: () => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  seekToTime?: number | null
  onSeekApplied?: () => void
}
```

### 5. PlayerClient / MiniPlayer Adaptation

`PlayerClient` currently hardcodes `<MiniPlayer youtubeId={video.youtube_id} …/>`.

For issue #138, branch on `video.source_type`:
```tsx
{isMiniPlayerOpen && video.source_type === 'local' ? (
  <LocalVideoPlayer videoId={video.id} … />
) : isMiniPlayerOpen ? (
  <MiniPlayer youtubeId={video.youtube_id} … />
) : null}
```

The transcript sync logic in `PlayerClient` is **source-agnostic** — it only looks at `playbackTime.current` vs cue timestamps. No changes needed there.

---

## Key Patterns to Follow

| Pattern | Rule |
|---|---|
| API route runtime | Every `src/app/api/` file must export `export const runtime = 'nodejs'` |
| Dynamic params | `params` is `Promise<{ id: string }>` — always `await params` before use |
| Composition root | Import `videoStore` / `videoService` from `@/lib/server/composition` — never construct directly |
| Zod error access | Use `result.error.issues[0].message` (Zod v4 — not `.errors`) |
| Tags storage | JSON array string in DB; domain type is `string[]`; `rowToVideo` deserializes |
| Jest env for API tests | API route test files must start with `// @jest-environment node` |
| Path alias | Use `@/` for `src/` in all imports |
| DB migrations | Wrap `ALTER TABLE ADD COLUMN` in try/catch for idempotency |

---

## Gotchas

1. **`better-sqlite3` is synchronous** — all DB calls are sync. Do not `await` store methods.
2. **Node.js stream → Web stream**: `NextResponse` body must be a Web API `ReadableStream`. Convert with `Readable.toWeb(nodeStream)` from `'stream'` module.
3. **Range request is required for seek**: Without `206 Partial Content` support, browsers cannot seek in `<video>`. The stream route must parse the `Range` header.
4. **`youtube_url` NOT NULL constraint**: New local records need a placeholder value or a schema migration to make the column nullable. Easiest: `ALTER TABLE videos ALTER COLUMN …` is not supported in SQLite — instead add new columns and use `DEFAULT ''` for backward compat, or use `CHECK` constraints only on new rows.
5. **No new npm packages needed**: Node.js `fs`, `stream` are built-in. `NextResponse` with a `ReadableStream` body is the correct Next.js 16 streaming pattern.
6. **`src/lib/transcripts.ts` local file access pattern**: Uses `fs.readFileSync` / `fs.writeFileSync` — same approach for streaming the local video (use `fs.createReadStream` for efficiency).
7. **`E2E_STUB_YOUTUBE` pattern**: E2E tests stub YouTube at the `fetchYoutubeMetadata` level. Local video E2E tests will need fixture video files or a separate stub strategy for the stream route.
