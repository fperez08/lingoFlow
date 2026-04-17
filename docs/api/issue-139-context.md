# Issue #139 — Direct Upload Import Flow: Context & Implementation Guide

## Current YouTube Import Flow

### API Route: `POST /api/videos/import`
File: `src/app/api/videos/import/route.ts`

1. Reads `multipart/form-data` via `request.formData()`.
2. Validates with `ImportVideoRequestSchema` (Zod): requires `youtube_url` (string), `transcript` (File, `.srt`/`.vtt`/`.txt`), optional `tags` (comma-separated string).
3. Calls `fetchYoutubeMetadata(youtubeUrl)` → gets `title`, `author_name`, `thumbnail_url`, `youtube_id`.
4. Generates `videoId = crypto.randomUUID()`.
5. Reads transcript file buffer: `Buffer.from(await transcriptFile.arrayBuffer())`.
6. Parses tags: `tagsString.split(',').map(t => t.trim()).filter(Boolean)`.
7. Calls `videoService.importVideo({ id, youtube_url, youtube_id, title, author_name, thumbnail_url, transcript_ext, transcript_buffer, tags })`.
8. Returns `201` with the created `Video` object.

### VideoService.importVideo
File: `src/lib/video-service.ts`

- Writes transcript to disk via `TranscriptStore.write(videoId, ext, buffer)` → returns `transcript_path`.
- Inserts record via `VideoStore.insert(params)`.
- On store insert failure: cleans up transcript file.

`ImportVideoParams` interface (current):
```ts
interface ImportVideoParams {
  id: string
  youtube_url: string
  youtube_id: string
  title: string
  author_name: string
  thumbnail_url: string
  transcript_ext: string
  transcript_buffer: Buffer
  tags: string[]
}
```

### Transcript Handling
File: `src/lib/transcripts.ts`

- `writeTranscript(videoId, ext, buffer)` → writes to `.lingoflow-data/transcripts/{videoId}.{ext}`, returns full path.
- `deleteTranscript(filePath)` → unlinkSync, ignores ENOENT.
- Data dir: `process.env.LINGOFLOW_DATA_DIR ?? path.join(process.cwd(), '.lingoflow-data')`.

### UI: ImportVideoModal + useImportVideoForm
Files: `src/components/ImportVideoModal.tsx`, `src/hooks/useImportVideoForm.ts`

- Form fields: YouTube URL (required), Transcript (file upload or paste), Tags (comma-separated string).
- Transcript upload supports `.srt`, `.vtt`, `.txt`; paste mode auto-detects format via `detectPastedTranscriptFormat`.
- On submit: builds `FormData` with `youtube_url`, `transcript` (File), optional `tags`; POSTs to `/api/videos/import`.
- Shows YouTube preview (thumbnail, title, author) fetched via debounced `fetchYoutubeMetadata` call.

### DB Schema (post-PR #143)
File: `src/lib/db.ts`

Videos table has:
- `source_type TEXT NOT NULL DEFAULT 'youtube'` — `'youtube'` or `'local'`
- `local_video_path TEXT` — relative or absolute path to uploaded video file
- `local_video_filename TEXT` — original filename for display

Video files are stored in `.lingoflow-data/videos/` (created by `ensureDataDirs`).

### Video Streaming
File: `src/app/api/videos/[id]/stream/route.ts`

- `GET /api/videos/:id/stream` — reads `video.local_video_path`, resolves absolute path, streams with Range support (HTTP 206).
- Supported MIME types: `mp4` → `video/mp4`, `webm` → `video/webm`, `mov` → `video/quicktime`.
- Returns 404 if video has no `local_video_path` or file doesn't exist.

---

## What Needs to Change for Local File Upload

### New API Route: `POST /api/videos/local-import` (or extend existing)
Recommended: new route `src/app/api/videos/local-import/route.ts` to avoid breaking the YouTube flow.

**New FormData fields:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `video_file` | File | Yes | `.mp4`, `.webm`, `.mov` |
| `title` | string | Yes | User-supplied, no oEmbed fetch |
| `author` | string | No | Optional author name |
| `transcript` | File | Yes | `.srt`, `.vtt`, `.txt` |
| `tags` | string | No | Comma-separated |

**New Zod schema** (add to `src/lib/api-schemas.ts`):
```ts
const ALLOWED_VIDEO_FORMATS = ['mp4', 'webm', 'mov'] as const

export const LocalImportRequestSchema = z.object({
  video_file: z.custom<File>(isFileLike, 'Video file is required')
    .refine(f => ALLOWED_VIDEO_FORMATS.includes(getFileExtension(f.name) as typeof ALLOWED_VIDEO_FORMATS[number]),
      `Invalid video format. Allowed: ${ALLOWED_VIDEO_FORMATS.join(', ')}`),
  title: z.preprocess(v => (v == null ? '' : v), z.string().trim().min(1, 'Title is required')),
  author: z.preprocess(v => (v == null ? '' : String(v)), z.string().trim()).optional(),
  transcript: transcriptFileSchema,   // reuse existing
  tags: z.custom<string | null | undefined>(v => v == null || typeof v === 'string')
    .transform(v => (typeof v === 'string' ? v : '')),
})
```

**New VideoService method** — extend `ImportVideoParams` or add `importLocalVideo`:
```ts
interface ImportLocalVideoParams {
  id: string
  title: string
  author_name: string         // default '' if not provided
  video_buffer: Buffer
  video_filename: string      // original filename, used to derive ext + save path
  transcript_ext: string
  transcript_buffer: Buffer
  tags: string[]
}
```

**Store insert** — `InsertVideoParams` and `SqliteVideoStore.insert()` currently do NOT write `source_type`, `local_video_path`, or `local_video_filename`. These must be added:
- Extend `InsertVideoParams` in `src/lib/videos.ts` with optional `source_type`, `local_video_path`, `local_video_filename`.
- Update `SqliteVideoStore.insert()` SQL to include those three columns.

---

## Next.js multipart/form-data Handling

Next.js App Router route handlers parse multipart bodies with the standard Web API:

```ts
export async function POST(request: NextRequest) {
  const formData = await request.formData()

  // Get a string field
  const title = formData.get('title')        // string | File | null

  // Get a file field
  const videoFile = formData.get('video_file') as File | null
  const buffer = Buffer.from(await videoFile.arrayBuffer())
  const filename = videoFile.name             // original filename
  const size = videoFile.size                 // bytes
}
```

No additional libraries needed. `request.formData()` handles multipart parsing natively in the Node.js runtime.

**Pattern for saving an uploaded file:**
```ts
const videoId = crypto.randomUUID()
const ext = videoFile.name.split('.').pop()?.toLowerCase() ?? 'mp4'
const savePath = path.join(dataDir, 'videos', `${videoId}.${ext}`)
fs.mkdirSync(path.dirname(savePath), { recursive: true })
fs.writeFileSync(savePath, buffer)
```

---

## File Size Limits in Next.js

By default, Next.js limits request body size to **4 MB** for API routes.

For video uploads (typically tens to hundreds of MB), this must be raised in `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  // ... existing headers config ...
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',  // for Server Actions only
    },
  },
}
```

For **Route Handlers** (App Router), the limit is configured differently — it's the underlying Node.js/Vercel config. In local dev (no edge), there is effectively no hard limit beyond Node.js memory, but it is best practice to configure explicitly:

```ts
// In the route file itself, export a config object:
export const config = {
  api: {
    bodyParser: false,  // not needed for App Router, but harmless
  },
}
```

> **Note:** For App Router route handlers, Next.js does not expose a per-route `bodyParser` size config like Pages Router. The effective limit in the Node.js runtime is the Node.js process memory. For production deployments (Vercel/other), platform-level upload limits apply. For local-only use (this app's design), this is not a concern. However, `next.config.ts` can set:

```ts
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
}
```

This covers Server Actions. For Route Handlers under Node.js runtime with `better-sqlite3`, no additional config is needed in local dev.

---

## Where to Save Uploaded Video Files

**Directory:** `.lingoflow-data/videos/`

Already created by `ensureDataDirs` in `src/lib/db.ts`:
```ts
fs.mkdirSync(path.join(dataDir, 'videos'), { recursive: true })
```

**Naming convention** (mirrors transcript pattern):
```
.lingoflow-data/videos/{videoId}.{ext}
```

**Path stored in DB:** Store as relative path `videos/{videoId}.{ext}` (relative to `dataDir`) so it remains portable if `LINGOFLOW_DATA_DIR` changes. The stream route already handles both absolute and relative paths:
```ts
const filePath = path.isAbsolute(video.local_video_path)
  ? video.local_video_path
  : path.join(dataDir, video.local_video_path)
```

---

## Key Patterns to Follow

### 1. Zod validation in `api-schemas.ts`
All API request shapes are defined in `src/lib/api-schemas.ts`. Add `LocalImportRequestSchema` here, not inline in the route. Reuse `transcriptFileSchema` and `isFileLike` helpers (already defined there).

### 2. Service wiring in `composition.ts`
Route handlers must NOT instantiate services directly. Import from `@/lib/server/composition`:
```ts
import { videoService } from '@/lib/server/composition'
```
If `VideoService` needs a new method (e.g., `importLocalVideo`), add it to `VideoService` class and update the interface. `composition.ts` wires everything.

### 3. `export const runtime = 'nodejs'`
Every file under `src/app/api/` must export this. `better-sqlite3` is a native module incompatible with the Edge runtime.

### 4. Params awaited in dynamic routes
```ts
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

### 5. Tags format on import
`POST /api/videos/local-import` → `tags` as **comma-separated string** (same as existing import route).
`PATCH /api/videos/[id]` → `tags` as **JSON array string**.

### 6. `source_type` for local videos
Set `source_type: 'local'` when inserting local-upload records. `youtube_url`, `youtube_id`, `thumbnail_url` should be empty strings `''` (schema requires non-null strings — check if schema constraints need relaxing for local records, or use empty strings as sentinel values).

### 7. UI: new modal or tabbed flow
Consider adding a **source selector** (YouTube / Local File) at the top of `ImportVideoModal`, and conditionally rendering YouTube-specific fields (URL input, preview) vs. local-specific fields (video file picker, title input, optional author). Alternatively, create a separate `ImportLocalVideoModal` component.

The `useImportVideoForm` hook should be split or extended — local import does not need `fetchYoutubeMetadata` or the preview logic.

### 8. Player page for local videos
`src/app/(app)/player/[id]/page.tsx` is a Server Component that fetches the video and renders `PlayerClient`. Ensure `PlayerClient` handles `source_type === 'local'` by rendering a `<video>` element with `src="/api/videos/{id}/stream"` instead of the YouTube iframe.

---

## Summary of Files to Create/Modify

| File | Action | Notes |
|---|---|---|
| `src/lib/api-schemas.ts` | Add | `LocalImportRequestSchema` |
| `src/lib/videos.ts` | Modify | Extend `InsertVideoParams` with `source_type`, `local_video_path`, `local_video_filename` |
| `src/lib/video-service.ts` | Modify | Add `importLocalVideo(params)` method + `ImportLocalVideoParams` interface |
| `src/lib/video-store.ts` | Modify | Update `insert()` SQL to write `source_type`, `local_video_path`, `local_video_filename` |
| `src/app/api/videos/local-import/route.ts` | Create | New route, mirrors import/route.ts pattern |
| `src/components/ImportVideoModal.tsx` | Modify | Add source selector, local-upload fields |
| `src/hooks/useImportVideoForm.ts` | Modify | Handle local import mode (no preview fetch, new fields) |
| `next.config.ts` | Modify | Add `experimental.serverActions.bodySizeLimit` if needed |
| `src/app/(app)/player/[id]/PlayerClient.tsx` | Modify | Handle `source_type === 'local'` rendering |
