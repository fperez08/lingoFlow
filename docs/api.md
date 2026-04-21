# LingoFlow — API Documentation

> Canonical API reference generated from source. Covers all REST endpoints, TypeScript types, service interfaces, and key library patterns.
>
> Last updated: 2026-07 — Next.js 16.2.3, React 19, better-sqlite3 12, Zod 4.

---

## Detected Stack

| Layer | Library | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.3 |
| UI | React | 19.2.4 |
| Language | TypeScript | ^5 (`strict: true`) |
| Styling | Tailwind CSS | ^3.4.19 |
| Data fetching | TanStack React Query | ^5.96.2 |
| Database | better-sqlite3 | ^12.8.0 |
| Validation | Zod | ^4.3.6 |
| Video processing | fluent-ffmpeg | ^2.1.3 |
| Unit tests | Jest + Testing Library | ^30.3.0 |
| E2E tests | Playwright | ^1.59.1 |
| Package manager | pnpm | — |
| Node runtime | Node | 24 |

---

## REST API Endpoints

> All routes export `export const runtime = 'nodejs'` — `better-sqlite3` is a native addon incompatible with the Edge runtime.

### `GET /api/videos`

List all videos ordered by `created_at DESC`.

**Response** `200 Video[]`

```json
[{
  "id": "uuid",
  "title": "string",
  "author_name": "string",
  "thumbnail_url": "string",
  "transcript_path": "string",
  "transcript_format": "srt|vtt|txt",
  "tags": ["string"],
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "source_type": "local",
  "local_video_path": "string|null",
  "local_video_filename": "string|null",
  "thumbnail_path": "string|null"
}]
```

**Error** `500 { "error": "Internal server error" }`

---

### `POST /api/videos/import`

Import a local video file. Body is `multipart/form-data`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `video` | `File` | ✅ | MP4/WebM/MOV; max 500 MB |
| `title` | `string` | ✅ | Min length 1 (trimmed) |
| `author` | `string` | ❌ | Optional author name |
| `transcript` | `File` | ✅ | `.srt`, `.vtt`, or `.txt` |
| `tags` | `string` | ❌ | **Comma-separated**: `"french,beginner"` |

**Response** `201 Video` on success

**Errors**
- `400 { "error": "Only local video upload is supported" }` — no video file
- `400 { "error": "<zod message>" }` — validation failure
- `500 { "error": "Internal server error" }`

**Constants** (`src/lib/api-schemas.ts`)
```ts
ALLOWED_VIDEO_MIME_TYPES   = ['video/mp4', 'video/webm', 'video/quicktime']
ALLOWED_TRANSCRIPT_FORMATS = ['srt', 'vtt', 'txt']
MAX_VIDEO_SIZE_BYTES        = 524_288_000  // 500 MB
```

---

### `GET /api/videos/[id]`

Get a single video by ID.

**Response**
- `200 Video`
- `404` plain text `"Not Found"`
- `500 { "error": "Internal server error" }`

---

### `PATCH /api/videos/[id]`

Update video metadata. Body is `multipart/form-data`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `tags` | `string` | ✅ | **JSON array string**: `'["french","beginner"]'` |
| `transcript` | `File` | ❌ | Replacement transcript |

**Response**
- `200 Video`
- `400 { "error": "<zod message>" }` — validation failure
- `404 { "error": "Video not found" }`
- `500 { "error": "Internal server error" }`

> ⚠️ **Tags format differs between routes:**
> - `POST /api/videos/import` → comma-separated: `"french,beginner"`
> - `PATCH /api/videos/[id]` → JSON array string: `'["french","beginner"]'`

---

### `DELETE /api/videos/[id]`

Deletes the video record plus all associated files (transcript, video, thumbnail).

**Response**
- `204` (no body)
- `404` plain text `"Not Found"`
- `500` plain text `"Internal Server Error"`

---

### `GET /api/videos/[id]/transcript`

Return parsed transcript cues.

**Response** `200`
```json
{ "cues": [{ "index": 1, "startTime": "00:00:01,000", "endTime": "00:00:03,500", "text": "Hello" }] }
```
Returns `{ "cues": [] }` if video has no transcript.
`404` plain text if video does not exist.

---

### `GET /api/videos/[id]/stream`

Stream the local video file. Supports HTTP range requests.

| Header | Example | Notes |
|---|---|---|
| `Range` | `bytes=0-1048575` | Optional; triggers 206 |

**Response**
- `200` full file — `Content-Type`, `Content-Length`, `Accept-Ranges: bytes`
- `206` partial — `Content-Range: bytes start-end/total`
- `404` plain text — file missing
- `500` plain text

---

### `GET /api/videos/[id]/thumbnail`

Return JPEG thumbnail.

**Response**
- `200 image/jpeg` with `Cache-Control: public, max-age=31536000, immutable`
- `404` (no body)

---

### `GET /api/vocabulary`

List all vocabulary entries ordered by `word ASC`.

**Response** `200 VocabEntry[]`
```json
[{ "word": "string", "status": "new|learning|mastered", "level": "B2", "definition": "string" }]
```

**Error** `500 { "error": "Internal server error" }`

---

### `PATCH /api/vocabulary/[word]`

Upsert a vocabulary word's status. `word` is URL-decoded and lowercased server-side.

**Request** `Content-Type: application/json`
```json
{ "status": "new|learning|mastered" }
```

**Response**
- `200 VocabEntry`
- `400 { "error": "<zod message>" }` — invalid status value
- `500 { "error": "Internal server error" }`

---

## TypeScript Types

### `Video` — `src/lib/videos.ts`

```ts
type Video = {
  id: string
  title: string
  author_name: string
  thumbnail_url: string          // empty string for local-only videos
  transcript_path: string
  transcript_format: string      // 'srt' | 'vtt' | 'txt'
  tags: string[]
  created_at: string             // ISO 8601
  updated_at: string             // ISO 8601
  source_type: 'local'
  local_video_path: string | null
  local_video_filename: string | null
  thumbnail_path: string | null
}

type InsertVideoParams = Omit<Video, 'created_at' | 'updated_at'>
type UpdateVideoParams = {
  tags?: string[]
  transcript_path?: string
  transcript_format?: string
  thumbnail_path?: string | null
}
```

### `TranscriptCue` — `src/lib/parse-transcript.ts`

```ts
interface TranscriptCue {
  index: number
  startTime: string   // e.g. "00:00:01,000"
  endTime: string
  text: string
}
```

### `TranscriptToken` — `src/lib/tokenize-transcript.ts`

```ts
interface WordToken  { type: 'word';  value: string }
interface PunctToken { type: 'punct'; value: string }
type TranscriptToken = WordToken | PunctToken

tokenizeCueText(text: string): TranscriptToken[]
```

### `VocabEntry` — `src/lib/vocab-store.ts`

```ts
interface VocabEntry {
  word: string
  status: 'new' | 'learning' | 'mastered'
  level?: string      // CEFR e.g. 'B2'
  definition?: string
}
```

### `VocabWord` — `src/lib/vocabulary.ts` (mock data)

```ts
type VocabWord = {
  id: string
  word: string
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  definition: string
  contextQuote: string
  source: string
  status: 'new' | 'learning' | 'mastered'
}
```

---

## Database Schema

Managed by `initializeSchema(db)` in `src/lib/db.ts`. New columns added via `addColumnIfMissing`.

### `videos` table

```sql
CREATE TABLE IF NOT EXISTS videos (
  id                   TEXT PRIMARY KEY,
  title                TEXT NOT NULL,
  author_name          TEXT NOT NULL,
  thumbnail_url        TEXT NOT NULL,
  transcript_path      TEXT NOT NULL,
  transcript_format    TEXT NOT NULL,
  tags                 TEXT NOT NULL DEFAULT '[]',   -- JSON array string
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  source_type          TEXT,
  local_video_path     TEXT,
  local_video_filename TEXT,
  thumbnail_path       TEXT
)
```

### `vocabulary` table

```sql
CREATE TABLE IF NOT EXISTS vocabulary (
  word       TEXT PRIMARY KEY,
  status     TEXT NOT NULL CHECK(status IN ('new','learning','mastered')),
  level      TEXT,
  definition TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
```

**Tags serialization:** `tags` stores `JSON.stringify(string[])`. `rowToVideo()` deserializes on read. Never serialize manually in callers.

---

## Service & Store Interfaces

### `VideoStore` — `src/lib/video-store.ts`

```ts
interface VideoStore {
  list(): Video[]
  getById(id: string): Video | undefined
  insert(params: InsertVideoParams): Video
  update(id: string, params: UpdateVideoParams): Video | undefined
  delete(id: string): boolean
}
```

Implementation: `SqliteVideoStore`. All calls are synchronous.

### `VideoService` — `src/lib/video-service.ts`

```ts
class VideoService {
  registerPostImportTask(task: PostImportTask): this
  async drainPostImportTasks(video: Video): Promise<void>
  async importLocalVideo(params: ImportLocalVideoParams): Promise<Video>
  async updateVideo(id: string, params: UpdateVideoServiceParams): Promise<Video | undefined>
  async deleteVideo(id: string): Promise<boolean>
}

interface PostImportTask {
  run(video: Video): Promise<Partial<UpdateVideoParams>>
}
```

`ThumbnailTask` (registered in production) extracts JPEG via ffmpeg.

### `ImportLocalVideoParams`

```ts
interface ImportLocalVideoParams {
  id: string
  title: string
  author_name: string
  video_buffer: Buffer
  video_ext: string       // 'mp4' | 'webm' | 'mov'
  video_filename: string
  transcript_buffer: Buffer
  transcript_ext: string  // 'srt' | 'vtt' | 'txt'
  tags: string[]
  source_type: 'local'
}
```

### `VocabStore` — `src/lib/vocab-store.ts`

```ts
interface VocabStore {
  getAll(): VocabEntry[]
  getByWord(word: string): VocabEntry | null
  upsert(word: string, status: VocabEntry['status'], level?: string, definition?: string): VocabEntry
}
```

Implementation: `SqliteVocabStore`. All calls synchronous.

---

## Dependency Injection — Composition Root

`src/lib/server/composition.ts` is the DI root. **Never** instantiate services directly in route handlers.

```ts
import { getContainer } from '@/lib/server/composition'

// Inside a route handler (not at module scope):
const { videoStore, videoService, vocabStore } = getContainer()
```

### `Container` interface

```ts
interface Container {
  videoStore: SqliteVideoStore
  videoService: VideoService
  vocabStore: SqliteVocabStore
}
```

### `createContainer(dataDir)` — for tests

```ts
import { createContainer } from '@/lib/server/composition'

// In tests — uses in-memory SQLite:
jest.spyOn(composition, 'getContainer').mockReturnValue(createContainer(':memory:'))
```

When `dataDir === ':memory:'`:
- Uses `new Database(':memory:')` (no filesystem I/O)
- Transcript/video writes return virtual paths (`:memory:/transcripts/<id>.<ext>`)
- `ThumbnailTask` is **not** registered (avoids loading ffmpeg)

### `getContainer()` — production singleton

Lazily initialised on first call. Uses `LINGOFLOW_DATA_DIR` env var or `.lingoflow-data/`.

---

## ApiClient — `src/lib/api-client.ts`

```ts
interface ApiClient {
  listVideos(): Promise<Video[]>
  getVideo(id: string): Promise<Video>
  getTranscript(id: string): Promise<TranscriptCue[]>
  importVideo(form: FormData): Promise<Video>
  updateVideo(id: string, form: FormData): Promise<Video>
  deleteVideo(id: string): Promise<void>
}

// React context provider
<ApiClientProvider client={new FetchApiClient()}>...</ApiClientProvider>

// Hook to consume it
const apiClient = useApiClient()
```

### Query keys

```ts
import { queryKeys } from '@/lib/api-client'

queryKeys.videos()         // ['videos']
queryKeys.video(id)        // ['videos', id]
queryKeys.transcript(id)   // ['transcript', id]
```

---

## Custom Hooks

### `useVideos()` — `src/hooks/useVideos.ts`

```ts
const { data: videos = [], isLoading, error } = useVideos()
// UseQueryResult<Video[], Error> — fetches GET /api/videos
```

### `useVideoMutations()` — `src/hooks/useVideoMutations.ts`

```ts
const { deleteVideo, refreshVideos } = useVideoMutations()

deleteVideo.mutate(id)
deleteVideo.mutate(id, { onSuccess: () => ... })
refreshVideos()  // invalidateQueries({ queryKey: ['videos'] })
```

### `useImportVideoForm()` — `src/hooks/useImportVideoForm.ts`

```ts
const {
  videoFile, setVideoFile,
  title, setTitle,
  author, setAuthor,
  transcriptFile, setTranscriptFile,
  transcriptMode, setTranscriptMode,   // 'upload' | 'paste'
  pastedTranscript, setPastedTranscript,
  tags, setTags,
  isSubmitting,
  submitError,
  handleSubmit,
  canSubmit,
} = useImportVideoForm({ onSuccess, onClose })
```

### `usePlayerData()` — `src/hooks/usePlayerData.ts`

```ts
const { video, transcript, isLoading, error } = usePlayerData(id)
// Parallel-fetches video + transcript via useQueries
```

### `useVocabulary()` — `src/hooks/useVocabulary.ts`

```ts
const { data: vocabMap } = useVocabulary()
// UseQueryResult<Map<string, VocabEntry>, Error>
// Fetches GET /api/vocabulary; keyed by word.toLowerCase()

const mutation = useUpdateWordStatus()
mutation.mutate({ word: 'resilient', status: 'mastered' })
// PATCH /api/vocabulary/:word + invalidate ['vocabulary']
```

---

## Zod v4 Patterns

> ⚠️ **Breaking change from v3:** `.error.errors` renamed to `.error.issues`.

```ts
import { z } from 'zod'

const result = schema.safeParse(input)
if (!result.success) {
  return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
}
const data = result.data
```

### Schemas in codebase

| Schema | File | Used by |
|---|---|---|
| `ImportLocalVideoRequestSchema` | `src/lib/api-schemas.ts` | `POST /api/videos/import` |
| `UpdateVideoRequestSchema` | `src/lib/api-schemas.ts` | `PATCH /api/videos/[id]` |
| `UpdateVocabRequestSchema` | `src/lib/api-schemas.ts` | `PATCH /api/vocabulary/[word]` |
| `VideoSchema` | `src/lib/videos.ts` | DB row → `Video` |
| `InsertVideoParamsSchema` | `src/lib/videos.ts` | Store insert |
| `UpdateVideoParamsSchema` | `src/lib/videos.ts` | Store update |

---

## better-sqlite3 Patterns

All calls are **synchronous** (no `await`):

```ts
import Database from 'better-sqlite3'

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')  // always set WAL mode

const rows = db.prepare('SELECT * FROM videos ORDER BY created_at DESC').all()
const row  = db.prepare('SELECT * FROM videos WHERE id = ?').get(id)
db.prepare('INSERT INTO videos (...) VALUES (...)').run(...values)
db.prepare('UPDATE videos SET tags = ? WHERE id = ?').run(JSON.stringify(tags), id)
db.prepare('DELETE FROM videos WHERE id = ?').run(id)
```

### Additive migration

```ts
const addColumnIfMissing = (column: string, definition: string) => {
  try {
    db.exec(`ALTER TABLE videos ADD COLUMN ${column} ${definition}`)
  } catch { /* already exists — ignore */ }
}
```

---

## TanStack React Query v5

### Provider

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

Wrapped in `src/app/layout.tsx`.

### `useMutation` + cache invalidation

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

const deleteVideo = useMutation<void, Error, string>({
  mutationFn: async (id) => {
    const res = await fetch(`/api/videos/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete video')
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['videos'] }),
})
```

### `useQueries` (parallel fetch)

```ts
import { useQueries } from '@tanstack/react-query'

const [videoResult, transcriptResult] = useQueries({
  queries: [
    { queryKey: queryKeys.video(id),       queryFn: () => apiClient.getVideo(id) },
    { queryKey: queryKeys.transcript(id),  queryFn: () => apiClient.getTranscript(id) },
  ]
})
```

---

## Next.js App Router Patterns

### Dynamic route params must be awaited

```ts
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // ...
}
```

### Response patterns

```ts
import { NextResponse } from 'next/server'

NextResponse.json(data)                              // 200
NextResponse.json(data, { status: 201 })             // 201
NextResponse.json({ error: 'msg' }, { status: 400 }) // 400
new NextResponse(null, { status: 204 })              // 204 No Content
new NextResponse('Not Found', { status: 404 })       // 404 plain text
new Response(buffer, { headers: { 'Content-Type': 'image/jpeg' } }) // binary
```

---

## Transcript Utilities

### `parseTranscript` — `src/lib/parse-transcript.ts`

```ts
const cues: TranscriptCue[] = parseTranscript(fileContent, 'srt')
// formats: 'srt' | 'vtt' | 'txt'
```

### `detectPastedTranscriptFormat` — `src/lib/detect-transcript-format.ts`

```ts
const ext = detectPastedTranscriptFormat(text)  // 'vtt' | 'srt' | 'txt'
```

### `tokenizeCueText` — `src/lib/tokenize-transcript.ts`

```ts
import { tokenizeCueText } from '@/lib/tokenize-transcript'

const tokens: TranscriptToken[] = tokenizeCueText('Hello, world!')
// [{ type: 'word', value: 'Hello' }, { type: 'punct', value: ',' }, ...]
```

### File I/O — `src/lib/transcripts.ts`

```ts
writeTranscript(videoId, ext, buffer): string   // writes to getTranscriptsDir(); returns path
deleteTranscript(filePath): void                 // ENOENT silently ignored
```

---

## Data Directory — `src/lib/data-dir.ts`

```ts
getDataDir(): string        // LINGOFLOW_DATA_DIR ?? cwd()/.lingoflow-data
getTranscriptsDir(): string // <dataDir>/transcripts
getVideosDir(): string      // <dataDir>/videos
getThumbnailsDir(): string  // <dataDir>/thumbnails
getDbPath(): string         // <dataDir>/lingoflow.db
```

Override root via `LINGOFLOW_DATA_DIR` env var.

---

## Testing Patterns

### API route tests require node environment

```ts
// @jest-environment node
```

Default `jsdom` lacks `Request`/`Response` globals.

### Mocking the composition root

```ts
jest.mock('@/lib/server/composition', () => ({
  getContainer: jest.fn().mockReturnValue({
    videoStore: { list: jest.fn(), getById: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() },
    videoService: { importLocalVideo: jest.fn(), updateVideo: jest.fn(), deleteVideo: jest.fn() },
    vocabStore: { getAll: jest.fn(), getByWord: jest.fn(), upsert: jest.fn() },
  }),
}))
```

### In-memory container for integration tests

```ts
import { createContainer } from '@/lib/server/composition'
import * as composition from '@/lib/server/composition'

jest.spyOn(composition, 'getContainer').mockReturnValue(createContainer(':memory:'))
```
