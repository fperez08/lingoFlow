# Local Upload Import Flow

> Relevant to: **Issue #139 — Direct upload import flow**
>
> Builds on Issue #138 (PR #143) which added `source_type`, the streaming route, and `LocalVideoPlayer`.
> This doc covers the end-to-end changes needed to let users import a local video file through the UI.

---

## 1. Overview

The YouTube import flow (current) requires a URL, fetches metadata from oEmbed, and stores only a
YouTube video ID. The local upload flow replaces the URL field with a file picker and derives title
and author from user input instead of oEmbed:

```
User fills form (video file + title + optional author + transcript + tags)
  └─ ImportVideoModal submits multipart FormData to POST /api/videos/import
       └─ Route saves video file to .lingoflow-data/videos/<id>.<ext>
            └─ videoService.importLocalVideo(...) writes transcript + inserts DB row
                 └─ Dashboard React Query cache invalidates → card appears
                      └─ Clicking card opens /player/[id] → LocalVideoPlayer streams the file
```

Transcript loading, cue-sync highlighting, tags editing, and delete are all **unchanged**.

---

## 2. UI Changes — `ImportVideoModal` + `useImportVideoForm`

### 2.1 Import mode toggle

Add a top-level toggle between **YouTube** and **Local File** modes. Show it before any other
field. Suitable implementation: two `<button type="button">` siblings styled like the existing
transcript-mode toggle.

```tsx
// Top of form — mirrors the transcript-mode toggle pattern already in the modal
<div className="flex rounded-xl overflow-hidden border border-outline-variant/30 ...">
  <button type="button" onClick={() => setImportMode('youtube')} ...>YouTube</button>
  <button type="button" onClick={() => setImportMode('local')}   ...>Local File</button>
</div>
```

### 2.2 YouTube mode (existing)

No change. URL field, oEmbed preview, transcript, tags. `canSubmit` still requires a valid URL and
a transcript.

### 2.3 Local File mode (new)

Replace the YouTube URL field with three fields:

| Field | Required | Notes |
|---|---|---|
| Video file input | ✅ | `accept="video/*"` — `.mp4`, `.webm`, `.mkv`, etc. |
| Title text input | ✅ | Free text; used as `title` in DB row |
| Author text input | ❌ | Optional; defaults to `''` if empty |

Transcript and tags fields remain exactly as they are today.

`canSubmit` for local mode:
```ts
const canSubmit = importMode === 'local'
  ? !!videoFile && title.trim().length > 0 && (transcriptFile !== null || pastedTranscript.replace(/\s/g, '').length >= 10)
  : /* existing YouTube logic */
```

### 2.4 `useImportVideoForm` additions

New state fields:

```ts
const [importMode, setImportMode] = useState<'youtube' | 'local'>('youtube')
const [videoFile, setVideoFile]   = useState<File | null>(null)
const [title, setTitle]           = useState('')
const [author, setAuthor]         = useState('')
```

`handleSubmit` branches on `importMode`:

```ts
if (importMode === 'local') {
  formData.append('video',  videoFile!)
  formData.append('title',  title.trim())
  if (author.trim()) formData.append('author', author.trim())
  // transcript + tags appended same as YouTube path
} else {
  formData.append('youtube_url', youtubeUrl)
  // transcript + tags same as today
}
```

`UseImportVideoFormResult` gains: `importMode`, `setImportMode`, `videoFile`, `setVideoFile`,
`title`, `setTitle`, `author`, `setAuthor`.

### 2.5 Reset on close

`setImportMode('youtube')`, `setVideoFile(null)`, `setTitle('')`, `setAuthor('')` in the existing
reset block after `onSuccess()`.

---

## 3. API Changes — `POST /api/videos/import`

**File:** `src/app/api/videos/import/route.ts`

### 3.1 Route detection logic

Distinguish the two import paths by whether a `video` file field is present in `FormData`:

```ts
const videoFile = formData.get('video')
const isLocal   = videoFile instanceof File && videoFile.size > 0
```

### 3.2 Local path handling

```ts
if (isLocal) {
  const result = ImportLocalVideoRequestSchema.safeParse({
    video:      formData.get('video'),
    title:      formData.get('title'),
    author:     formData.get('author'),
    transcript: formData.get('transcript'),
    tags:       formData.get('tags'),
  })
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { video, title, author, transcript: transcriptFile, tags: tagsString } = result.data
  const videoId           = crypto.randomUUID()
  const videoBuffer       = Buffer.from(await video.arrayBuffer())
  const videoExt          = video.name.split('.').pop()?.toLowerCase() || 'mp4'
  const transcriptBuffer  = Buffer.from(await transcriptFile.arrayBuffer())
  const transcriptExt     = transcriptFile.name.split('.').pop()?.toLowerCase() || ''
  const tags              = tagsString.split(',').map(t => t.trim()).filter(Boolean)

  const record = await videoService.importLocalVideo({
    id:                  videoId,
    title,
    author_name:         author ?? '',
    video_buffer:        videoBuffer,
    video_ext:           videoExt,
    video_filename:      video.name,
    transcript_buffer:   transcriptBuffer,
    transcript_ext:      transcriptExt,
    tags,
  })

  return NextResponse.json(record, { status: 201 })
}
// else: existing YouTube path unchanged
```

### 3.3 New Zod schema — `ImportLocalVideoRequestSchema` (`src/lib/api-schemas.ts`)

```ts
export const ImportLocalVideoRequestSchema = z.object({
  video: z.custom<File>(isFileLike, 'Video file is required'),
  title: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim() : ''),
    z.string().min(1, 'Title is required')
  ),
  author: z
    .custom<string | null | undefined>((v) => v === null || v === undefined || typeof v === 'string')
    .transform((v) => (typeof v === 'string' ? v.trim() : '')),
  transcript: transcriptFileSchema,   // reuse existing definition
  tags: /* same optional comma-string as ImportVideoRequestSchema */,
})
```

`isFileLike` and `transcriptFileSchema` are already defined in `api-schemas.ts`; reuse them.

---

## 4. Service Layer — `VideoService.importLocalVideo`

**File:** `src/lib/video-service.ts`

### 4.1 New interface

```ts
export interface ImportLocalVideoParams {
  id:               string
  title:            string
  author_name:      string
  video_buffer:     Buffer
  video_ext:        string
  video_filename:   string    // original filename from the upload
  transcript_buffer: Buffer
  transcript_ext:    string
  tags:             string[]
}
```

### 4.2 New method

```ts
async importLocalVideo(params: ImportLocalVideoParams): Promise<Video> {
  // 1. write video file to .lingoflow-data/videos/<id>.<ext>
  const videoPath = this.videos.write(params.id, params.video_ext, params.video_buffer)

  // 2. write transcript file to .lingoflow-data/transcripts/<id>.<ext>
  let transcriptPath: string
  try {
    transcriptPath = this.transcripts.write(params.id, params.transcript_ext, params.transcript_buffer)
  } catch (err) {
    this.videos.delete(videoPath)  // roll back
    throw err
  }

  const insertParams: InsertVideoParams = {
    id:               params.id,
    youtube_url:      '',          // not applicable for local records
    youtube_id:       '',
    title:            params.title,
    author_name:      params.author_name,
    thumbnail_url:    '',
    transcript_path:  transcriptPath,
    transcript_format: params.transcript_ext,
    tags:             params.tags,
    source_type:      'local',
    local_video_path: videoPath,
    local_video_filename: params.video_filename,
  }

  try {
    return this.store.insert(insertParams)
  } catch (err) {
    this.transcripts.delete(transcriptPath)
    this.videos.delete(videoPath)  // roll back both files
    throw err
  }
}
```

### 4.3 `VideoFileStore` — new dependency

`VideoService` currently depends on `TranscriptStore` (write/delete by path). Introduce a parallel
`VideoFileStore` interface with the same shape:

```ts
export interface VideoFileStore {
  write(videoId: string, ext: string, buffer: Buffer): string  // returns absolute path
  delete(filePath: string): void
}
```

Inject it alongside `TranscriptStore` in the constructor:

```ts
constructor(
  private store:       VideoStore,
  private transcripts: TranscriptStore,
  private videos:      VideoFileStore,   // NEW
) {}
```

Wire it in `src/lib/server/composition.ts` using the same filesystem helpers pattern as
`TranscriptStore` — writing to `<dataDir>/videos/`.

### 4.4 `deleteVideo` extension

When deleting a `local` record, also unlink the video file:

```ts
if (existing.source_type === 'local' && existing.local_video_path) {
  try {
    this.videos.delete(existing.local_video_path)
  } catch (err) {
    console.error(`Failed to delete video file for ${id}:`, err)
  }
}
```

---

## 5. Data Layer — Store & Schema Updates

The data model columns (`source_type`, `local_video_path`, `local_video_filename`) are already
specified in **Issue #138** and documented in
[`docs/project/local-video-playback.md`](local-video-playback.md). Summary of required state:

| File | Required change |
|---|---|
| `src/lib/db.ts` | `ALTER TABLE ADD COLUMN` for `source_type`, `local_video_path`, `local_video_filename`; `ensureDataDirs` creates `videos/` subdir |
| `src/lib/videos.ts` | `VideoSchema` / `InsertVideoParamsSchema` gain 3 new optional fields; `youtube_url` / `youtube_id` made nullable or given empty-string defaults |
| `src/lib/video-store.ts` | `VideoRow` interface updated; `rowToVideo` maps new fields |

If Issue #138 is already merged, these columns exist and only the service/route work remains.

---

## 6. Dashboard Refresh

No special handling needed. The existing `useVideos` hook uses React Query with `invalidateQueries`
after any mutation. The import modal already calls `onSuccess()` → which the dashboard wires to
`refetch()` / `invalidateQueries`. The new local record will appear as a `VideoCard` immediately.

`VideoCard` should render gracefully when `thumbnail_url` is `''` (no YouTube thumbnail). A
placeholder icon or a generic film-strip SVG is appropriate for local records.

---

## 7. Player

No new player work required for this issue. Issue #138 already specified `LocalVideoPlayer` and
the `source_type` branch in `PlayerClient`. Once a local record exists in the DB, navigating to
`/player/[id]` will render `LocalVideoPlayer` with `src=/api/videos/[id]/stream`.

---

## 8. Full Data Flow Diagram

```
ImportVideoModal (local mode)
  videoFile + title + author + transcriptFile + tags
      │
      ▼
useImportVideoForm.handleSubmit
  builds FormData { video, title, author, transcript, tags }
      │
      ▼ POST multipart/form-data
POST /api/videos/import
  detects video field → isLocal = true
  validates with ImportLocalVideoRequestSchema
  crypto.randomUUID() → videoId
  reads video buffer + transcript buffer
      │
      ▼
videoService.importLocalVideo(params)
  │
  ├─ VideoFileStore.write(id, ext, buffer)
  │     → .lingoflow-data/videos/<id>.<ext>
  ├─ TranscriptStore.write(id, ext, buffer)
  │     → .lingoflow-data/transcripts/<id>.<ext>
  └─ VideoStore.insert({
         source_type: 'local',
         local_video_path: '/abs/path/to/<id>.<ext>',
         local_video_filename: 'original.mp4',
         youtube_url: '', youtube_id: '',
         title, author_name, thumbnail_url: '', ...
     })
      │
      ▼ 201 JSON Video record
ImportVideoModal
  onSuccess() → invalidateQueries(['videos'])
  onClose()
      │
      ▼
Dashboard re-renders with new VideoCard
User clicks card → /player/[id]
  PlayerClient: video.source_type === 'local'
    → <LocalVideoPlayer src="/api/videos/<id>/stream" />
```

---

## 9. Affected Files

| File | Change type | Summary |
|---|---|---|
| `src/components/ImportVideoModal.tsx` | Modify | Add import-mode toggle; local-file fields (video, title, author) |
| `src/hooks/useImportVideoForm.ts` | Modify | `importMode`, `videoFile`, `title`, `author` state; branch in `handleSubmit` and `canSubmit` |
| `src/app/api/videos/import/route.ts` | Modify | Detect `video` field; local path delegates to `videoService.importLocalVideo` |
| `src/lib/api-schemas.ts` | Modify | Add `ImportLocalVideoRequestSchema` |
| `src/lib/video-service.ts` | Modify | Add `ImportLocalVideoParams`, `VideoFileStore` interface, `importLocalVideo` method; extend `deleteVideo` |
| `src/lib/server/composition.ts` | Modify | Wire `VideoFileStore` implementation; pass to `VideoService` |
| `src/lib/db.ts` | Modify *(if #138 not yet merged)* | `ALTER TABLE` migrations; `ensureDataDirs` |
| `src/lib/videos.ts` | Modify *(if #138 not yet merged)* | Schema updates for new columns |
| `src/lib/video-store.ts` | Modify *(if #138 not yet merged)* | `VideoRow` + `rowToVideo` updates |
| `src/components/VideoCard.tsx` | Modify | Graceful rendering when `thumbnail_url` is empty |

---

## 10. Key Invariants to Preserve

| Behavior | How preserved |
|---|---|
| Transcript loading | `GET /api/videos/:id/transcript` is path-agnostic; unchanged |
| Cue-sync playback | `PlayerClient` time-update logic unchanged; only player component differs |
| Tags comma-string contract | `POST /api/videos/import` still reads tags as comma-separated string |
| `PATCH /api/videos/:id` tags contract | JSON array string; unchanged |
| Node.js runtime on all API routes | `export const runtime = 'nodejs'` already present; keep it |
| Composition root import | Route handler must `import { videoService } from '@/lib/server/composition'` — never construct directly |

---

## 11. References

- Local video data model and streaming route: [`docs/project/local-video-playback.md`](local-video-playback.md)
- Issue #138 implementation context: [`docs/api/issue-138-context.md`](../api/issue-138-context.md)
- Player and cue-sync: [`docs/project/player-feature.md`](player-feature.md)
- Transcript sync patterns: [`docs/api/transcript-sync.md`](../api/transcript-sync.md)
- Composition root: `src/lib/server/composition.ts`
- API schema contracts: `src/lib/api-schemas.ts`
