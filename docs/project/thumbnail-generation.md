# Thumbnail Generation — Design Document

## Overview

After a local video file is saved during import, the app asynchronously extracts a single JPEG frame using ffmpeg, saves it to `.lingoflow-data/thumbnails/<id>.jpg`, and updates the database record's `thumbnail_path`. Failure is non-blocking: a missing thumbnail is a graceful degraded state, not an error.

---

## Full Flow

```
POST /api/videos/import (local video)
  │
  ├─ VideoService.importLocalVideo()
  │     ├─ Save video file  → .lingoflow-data/videos/<id>.<ext>
  │     ├─ Save transcript  → .lingoflow-data/transcripts/<id>.<ext>
  │     └─ store.insert()   → DB row (thumbnail_path = NULL)
  │
  ├─ Return 201 with Video record (thumbnail_path = null)
  │
  └─ [non-blocking, after response] generateThumbnail(id, videoPath)
        ├─ ffmpeg extracts frame at t=1s → .lingoflow-data/thumbnails/<id>.jpg
        └─ store.update(id, { thumbnail_path: '<abs-path>' })
             → DB row updated; subsequent GET /api/videos/:id returns thumbnail_path
```

The route handler fires `generateThumbnail` without `await` (or uses `void`) so the HTTP response is not delayed by ffmpeg.

---

## Implementation Details

### 1. Dependencies

```bash
pnpm add fluent-ffmpeg @ffmpeg-installer/ffmpeg
pnpm add -D @types/fluent-ffmpeg
```

`@ffmpeg-installer/ffmpeg` bundles the ffmpeg binary for the current platform. No system ffmpeg required.

### 2. New lib: `src/lib/thumbnail.ts`

```ts
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import fs from 'fs'
import path from 'path'

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
): Promise<void> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .screenshots({
        timestamps: [1],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '640x?',
      })
  })
}
```

### 3. `src/lib/db.ts` — `ensureDataDirs`

```ts
fs.mkdirSync(path.join(dataDir, 'thumbnails'), { recursive: true })
```

### 4. `src/lib/db.ts` — `initializeSchema`

```ts
addColumnIfMissing('thumbnail_path', 'TEXT')
```

### 5. `src/lib/video-store.ts` — `update` method

Add handling for `thumbnail_path` alongside existing `tags`, `transcript_path`, etc.:

```ts
if (params.thumbnail_path !== undefined) {
  updates.push('thumbnail_path = ?')
  values.push(params.thumbnail_path)
}
```

Also update the `insert` SQL to include the column (pass `null` when not provided).

### 6. Import route — fire-and-forget thumbnail extraction

In `src/app/api/videos/import/route.ts`, after `videoService.importLocalVideo()` returns:

```ts
const thumbnailPath = path.join(dataDir, 'thumbnails', `${videoId}.jpg`)

// Non-blocking — do not await
void generateThumbnail(record.local_video_path!, thumbnailPath)
  .then(() => videoService.updateThumbnailPath(videoId, thumbnailPath))
  .catch(() => { /* swallow — thumbnail is optional */ })

return NextResponse.json(record, { status: 201 })
```

`updateThumbnailPath` can be a thin `VideoService` wrapper around `store.update(id, { thumbnail_path })`, or call `store.update` directly from the route handler if the service layer doesn't need it.

### 7. New API route: `GET /api/videos/[id]/thumbnail`

File: `src/app/api/videos/[id]/thumbnail/route.ts`

```ts
import fs from 'fs'
import { videoStore } from '@/lib/server/composition'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const video = videoStore.getById(id)

  if (!video?.thumbnail_path) {
    return new Response(null, { status: 404 })
  }

  try {
    const buf = fs.readFileSync(video.thumbnail_path)
    return new Response(buf, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}
```

---

## Display

### VideoCard (`src/components/VideoCard.tsx`)

For local videos, `thumbnail_url` is empty string (set in `importLocalVideo`). Pass a derived thumbnail URL alongside `thumbnail_url`:

Option A — add `source_type` + `id` props to `VideoCard` and compute `/api/videos/${id}/thumbnail` inside:

```tsx
const displayThumbnail =
  source_type === 'local' ? `/api/videos/${id}/thumbnail` : thumbnail_url
```

Option B — compute in the parent (dashboard) and pass as `thumbnail_url`.

Either way, the `<img>` tag already falls back to the placeholder SVG when `thumbnail_url` is falsy. For the API URL case, add an `onError` handler to hide the broken image and show the placeholder:

```tsx
<img
  src={displayThumbnail}
  alt={title}
  className="w-full h-full object-cover"
  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
/>
```

### Player surface (`src/components/LessonHero.tsx`)

`LessonHero` does not currently display a thumbnail. If a hero thumbnail is desired, add an `<img src={/api/videos/${video.id}/thumbnail}` with the same `onError` fallback pattern.

---

## Non-Blocking Contract

- ffmpeg extraction runs after the import response is sent.
- If ffmpeg fails (unsupported codec, corrupt file, short video < 1s), `thumbnail_path` stays `NULL`.
- Dashboard shows the placeholder SVG until the thumbnail is available; after the DB is updated, the next page load will resolve the thumbnail.
- Deleting a video (`VideoService.deleteVideo`) should also `fs.unlink` the thumbnail file if `thumbnail_path` is set (follow the same cleanup pattern used for `local_video_path` and `transcript_path`).

---

## Edge Cases

| Case | Behaviour |
|---|---|
| Video shorter than 1s | ffmpeg errors → thumbnail stays null |
| Unsupported codec | ffmpeg errors → thumbnail stays null |
| Disk full | ffmpeg errors → thumbnail stays null |
| YouTube import | `thumbnail_url` from oEmbed is used directly; no ffmpeg needed |
| Video deleted before thumbnail written | Cleanup on delete handles missing file (use `fs.unlink` with try/catch) |
| Thumbnail file manually deleted | Route returns 404; UI shows placeholder |
