# LingoFlow API Reference

> Quick reference for coding agents. Covers APIs, hooks, and patterns actually used in this codebase.

---

## Tech Stack Summary

| Layer | Version |
|---|---|
| Next.js (App Router) | 16.2.3 |
| React | 19.2.4 |
| TypeScript | 5 (`strict: true`) |
| TanStack React Query | 5.x |
| better-sqlite3 | 12.x |
| Zod | 4.x |
| Tailwind CSS | 3.x |

---

## Next.js App Router Patterns

### Route Handler Requirements

Every file under `src/app/api/` **must** export:
```ts
export const runtime = 'nodejs'
```
`better-sqlite3` is a native addon — it cannot run in the Edge runtime.

### Dynamic Route `params` — Must Be Awaited

In Next.js 16, `params` is typed as `Promise<{ id: string }>`:
```ts
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // ...
}
```

### Route Handler Response Patterns

```ts
import { NextResponse } from 'next/server'

// JSON response
return NextResponse.json(data)                            // 200
return NextResponse.json(data, { status: 201 })           // 201 Created
return NextResponse.json({ error: 'msg' }, { status: 400 }) // 400

// Plain response (no body)
return new NextResponse(null, { status: 204 })            // 204 No Content
return new NextResponse('Not Found', { status: 404 })     // 404 plain text

// File/stream response
return new Response(buffer, { headers: { 'Content-Type': 'image/jpeg' } })
```

### Server Component Pattern

```ts
// app/(app)/player/[id]/page.tsx
export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PlayerLoader id={id} />
}
```

### FormData Parsing in Route Handlers

```ts
const formData = await request.formData()
const title = formData.get('title')       // string | File | null
const file  = formData.get('transcript')  // File when uploaded
```

### Video Streaming with Range Requests (`GET /api/videos/[id]/stream`)

Supports `Range` header for partial content (HTTP 206). Pattern:
```ts
const rangeHeader = request.headers.get('range')
if (rangeHeader) {
  const [startStr, endStr] = rangeHeader.replace('bytes=', '').split('-')
  const start = parseInt(startStr, 10)
  const end = endStr ? parseInt(endStr, 10) : fileSize - 1
  // ... return 206 with Content-Range header
}
```

---

## REST API Endpoints

### `GET /api/videos`
Returns all videos ordered by `created_at DESC`.
- **Response**: `Video[]` (200)

### `POST /api/videos/import`
Import a local video. Body is `multipart/form-data`.

| Field | Type | Notes |
|---|---|---|
| `video` | `File` | MP4/WebM/MOV, max 500 MB |
| `title` | `string` | Required |
| `author` | `string` | Optional |
| `transcript` | `File` | `.srt`, `.vtt`, or `.txt` |
| `tags` | `string` | **Comma-separated** e.g. `"french,beginner"` |

- **Response**: `Video` (201) or `{ error: string }` (400/500)

### `GET /api/videos/[id]`
- **Response**: `Video` (200) or `"Not Found"` (404)

### `PATCH /api/videos/[id]`
Update video metadata. Body is `multipart/form-data`.

| Field | Type | Notes |
|---|---|---|
| `tags` | `string` | **JSON array string** e.g. `'["french","beginner"]'` |
| `transcript` | `File?` | Optional replacement transcript |

- **Response**: `Video` (200), `{ error }` (400/404/500)

### `DELETE /api/videos/[id]`
Deletes video record + transcript file + video file + thumbnail.
- **Response**: empty body (204) or `"Not Found"` (404)

### `GET /api/videos/[id]/transcript`
Returns parsed transcript cues.
- **Response**: `{ cues: TranscriptCue[] }` (200)

### `GET /api/videos/[id]/stream`
Streams local video file. Supports `Range` header for partial content.
- **Response**: full (200) or partial (206) with `Content-Range`

### `GET /api/videos/[id]/thumbnail`
Returns JPEG thumbnail. Cached 1 year (immutable).
- **Response**: `image/jpeg` (200) or empty (404)

---

## Tags API Contract — Critical Difference

| Route | `tags` format |
|---|---|
| `POST /api/videos/import` | Comma-separated string: `"french,beginner"` |
| `PATCH /api/videos/[id]` | JSON-serialized array: `'["french","beginner"]'` |

Tags are stored in SQLite as a JSON array string (`'["french","beginner"]'`) and deserialized to `string[]` by `SqliteVideoStore.rowToVideo()`.

---

## Zod v4 Patterns

### Basic Usage

```ts
import { z } from 'zod'

const schema = z.object({ name: z.string().min(1) })

const result = schema.safeParse(input)
if (!result.success) {
  // ✅ Zod v4: use .issues[0].message (NOT .errors)
  return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
}
const data = result.data
```

> **⚠️ Zod v4 breaking change**: `.error.errors` was renamed to `.error.issues`. Always use `.issues`.

### Custom Validator (file-like objects)

```ts
const fileSchema = z.custom<File>(
  (v) => v instanceof File || (typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>).name === 'string'),
  'File is required'
).refine(
  (f) => ['srt','vtt','txt'].includes(f.name.split('.').pop()?.toLowerCase() ?? ''),
  'Invalid extension'
)
```

### Transform + Preprocess

```ts
// preprocess: coerce before validation
z.preprocess((v) => (typeof v === 'string' ? v.trim() : ''), z.string().min(1))

// transform: parse after validation
z.string()
  .refine((v) => { try { return Array.isArray(JSON.parse(v)) } catch { return false } }, 'Must be JSON array')
  .transform((v) => JSON.parse(v) as string[])
```

### Schemas Used in Codebase

| Schema | Location | Purpose |
|---|---|---|
| `ImportLocalVideoRequestSchema` | `src/lib/api-schemas.ts` | `POST /api/videos/import` FormData |
| `UpdateVideoRequestSchema` | `src/lib/api-schemas.ts` | `PATCH /api/videos/[id]` FormData |
| `VideoSchema` | `src/lib/videos.ts` | DB row → `Video` type |
| `InsertVideoParamsSchema` | `src/lib/videos.ts` | Store insert params |
| `UpdateVideoParamsSchema` | `src/lib/videos.ts` | Store update params |
| `VocabWordSchema` | `src/lib/vocabulary.ts` | Vocabulary word type |

---

## better-sqlite3 / SQLite Patterns

### Opening the Database

```ts
import Database from 'better-sqlite3'

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')  // Always set WAL mode
```

### CRUD Operations

All `better-sqlite3` calls are **synchronous** (no `await`):

```ts
// SELECT many
const rows = db.prepare('SELECT * FROM videos ORDER BY created_at DESC').all()

// SELECT one
const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(id)

// INSERT / UPDATE / DELETE
db.prepare('INSERT INTO videos (...) VALUES (...)').run(...values)
db.prepare('UPDATE videos SET tags = ? WHERE id = ?').run(JSON.stringify(tags), id)
db.prepare('DELETE FROM videos WHERE id = ?').run(id)
```

### Schema Migration Pattern (addColumnIfMissing)

```ts
const addColumnIfMissing = (column: string, definition: string) => {
  try {
    db.exec(`ALTER TABLE videos ADD COLUMN ${column} ${definition}`)
  } catch {
    // Column already exists — ignore
  }
}
addColumnIfMissing('thumbnail_path', 'TEXT')
```

### Tags Serialization

Tags are `string[]` in TypeScript but stored as a JSON string in SQLite:
```ts
// Writing
JSON.stringify(tags)           // '["french","beginner"]'

// Reading (in rowToVideo)
JSON.parse(row.tags) as string[]
```

### `VideoStore` Interface

```ts
interface VideoStore {
  list(): Video[]
  getById(id: string): Video | undefined
  insert(params: InsertVideoParams): Video
  update(id: string, params: UpdateVideoParams): Video | undefined
  delete(id: string): boolean
}
```
Implementation: `SqliteVideoStore` in `src/lib/video-store.ts`.

### `videos` Table Schema

```sql
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author_name TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  transcript_path TEXT NOT NULL,
  transcript_format TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',           -- JSON array string
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  source_type TEXT,
  local_video_path TEXT,
  local_video_filename TEXT,
  thumbnail_path TEXT
)
```

---

## Dependency Injection / Composition Root

**Never** instantiate services directly in route handlers. Always import from the composition root:

```ts
import { videoStore, videoService } from '@/lib/server/composition'
```

`videoStore` → `SqliteVideoStore`  
`videoService` → `VideoService` (wraps store + transcript I/O + video file I/O)

### `VideoService` Methods

```ts
class VideoService {
  // Import a local video file + transcript
  async importLocalVideo(params: ImportLocalVideoParams): Promise<Video>

  // Update tags and/or replace transcript
  async updateVideo(id: string, params: UpdateVideoServiceParams): Promise<Video | undefined>

  // Delete video record, transcript file, video file, and thumbnail
  async deleteVideo(id: string): Promise<boolean>
}
```

---

## TanStack React Query v5 Patterns

### Provider Setup

```tsx
// src/components/Providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```
Wrapped in root `app/layout.tsx`.

### `useQuery`

```ts
import { useQuery, UseQueryResult } from '@tanstack/react-query'

function useVideos(): UseQueryResult<Video[], Error> {
  return useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const res = await fetch('/api/videos')
      if (!res.ok) throw new Error('Failed to fetch videos')
      return res.json() as Promise<Video[]>
    },
  })
}
```

### `useMutation` + Cache Invalidation

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

const deleteVideo = useMutation<void, Error, string>({
  mutationFn: async (id: string) => {
    const res = await fetch(`/api/videos/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete video')
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['videos'] })
  },
})

// Call: deleteVideo.mutate(id)
// With callbacks: deleteVideo.mutate(id, { onSuccess: () => ... })
```

### Manual Cache Refresh

```ts
const refreshVideos = () => queryClient.invalidateQueries({ queryKey: ['videos'] })
```

### Query Keys in Use

| Key | Data |
|---|---|
| `['videos']` | All videos (`Video[]`) |

---

## Custom Hooks

### `useVideos()` — `src/hooks/useVideos.ts`

```ts
const { data: videos = [], isLoading, error } = useVideos()
```
Fetches `GET /api/videos`. Returns `UseQueryResult<Video[], Error>`.

### `useVideoMutations()` — `src/hooks/useVideoMutations.ts`

```ts
const { deleteVideo, refreshVideos } = useVideoMutations()

deleteVideo.mutate(id)                             // triggers DELETE + cache invalidate
deleteVideo.mutate(id, { onSuccess: () => ... })   // with callback
refreshVideos()                                    // manual cache invalidate
```

### `useImportVideoForm()` — `src/hooks/useImportVideoForm.ts`

Form state manager for the import modal. Handles validation, file detection, and `POST /api/videos/import` submission.

```ts
const {
  videoFile, setVideoFile,
  title, setTitle,
  author, setAuthor,
  transcriptFile, setTranscriptFile,
  transcriptMode, setTranscriptMode,  // 'upload' | 'paste'
  pastedTranscript, setPastedTranscript,
  tags, setTags,
  isSubmitting,
  submitError,
  handleSubmit,
  canSubmit,
} = useImportVideoForm({ onSuccess, onClose })
```

---

## Transcript Utilities

### `parseTranscript(content, format)` — `src/lib/parse-transcript.ts`

```ts
import { parseTranscript, TranscriptCue } from '@/lib/parse-transcript'

const cues: TranscriptCue[] = parseTranscript(fileContent, 'srt')
// TranscriptCue: { index, startTime, endTime, text }
```

Supports: `'srt'`, `'vtt'`, `'txt'` (plain lines, no timestamps).

### `detectPastedTranscriptFormat(text)` — `src/lib/detect-transcript-format.ts`

```ts
import { detectPastedTranscriptFormat } from '@/lib/detect-transcript-format'

const ext = detectPastedTranscriptFormat(text)  // 'vtt' | 'srt' | 'txt'
```

### Transcript File I/O — `src/lib/transcripts.ts`

```ts
writeTranscript(videoId, ext, buffer): string   // returns file path
deleteTranscript(filePath): void                 // ENOENT silently ignored
```

---

## File & Data Layout

```
.lingoflow-data/          # Override with LINGOFLOW_DATA_DIR env var
  lingoflow.db            # SQLite database
  transcripts/            # <videoId>.<ext> files
  videos/                 # <videoId>.<ext> files
  thumbnails/             # <videoId>.jpg files
```

Directories created by `ensureDataDirs(dataDir)` from `src/lib/db.ts`.

---

## Testing Patterns

### API Route Tests

Must start with:
```ts
// @jest-environment node
```
Default `jsdom` lacks global `Request`/`Response`.

### Mocking the Composition Root

```ts
jest.mock('@/lib/server/composition', () => ({
  videoStore: { list: jest.fn(), getById: jest.fn(), ... },
  videoService: { importLocalVideo: jest.fn(), deleteVideo: jest.fn(), ... },
}))
```

### Allowed Transcript Formats

```ts
import { ALLOWED_TRANSCRIPT_FORMATS } from '@/lib/api-schemas'
// ['srt', 'vtt', 'txt']
```

### Allowed Video MIME Types & Size Limit

```ts
import { ALLOWED_VIDEO_MIME_TYPES, MAX_VIDEO_SIZE_BYTES } from '@/lib/api-schemas'
// ['video/mp4', 'video/webm', 'video/quicktime']
// 524_288_000 (500 MB)
```

---

## TypeScript Types Quick Reference

```ts
// src/lib/videos.ts
type Video = {
  id: string
  title: string
  author_name: string
  thumbnail_url: string
  transcript_path: string
  transcript_format: string
  tags: string[]
  created_at: string
  updated_at: string
  source_type: 'local'
  local_video_path?: string | null
  local_video_filename?: string | null
  thumbnail_path?: string | null
}

type InsertVideoParams = Omit<Video, 'created_at' | 'updated_at'>
type UpdateVideoParams = { tags?: string[]; transcript_path?: string; transcript_format?: string; thumbnail_path?: string | null }

// src/lib/parse-transcript.ts
interface TranscriptCue { index: number; startTime: string; endTime: string; text: string }

// src/lib/vocabulary.ts
type VocabWord = { id: string; word: string; level: 'A1'|'A2'|'B1'|'B2'|'C1'|'C2'; definition: string; contextQuote: string; source: string; status: 'new'|'learning'|'mastered' }
```
