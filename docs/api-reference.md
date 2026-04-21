# LingoFlow — API Reference

> Authoritative reference for all REST endpoints, service interfaces, data types, and key library patterns.
> Generated from source code at `/workspaces/lingoFlow/src/`.

---

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.3 |
| UI | React | 19.2.4 |
| Language | TypeScript | ^5 (`strict: true`) |
| Data fetching | TanStack React Query | ^5.96.2 |
| Database | better-sqlite3 | ^12.8.0 |
| Validation | Zod | ^4.3.6 |
| Styling | Tailwind CSS | ^3.4.19 |
| Unit tests | Jest | ^30.3.0 |
| E2E tests | Playwright | ^1.59.1 |

---

## REST API Endpoints

All routes require `export const runtime = 'nodejs'` — `better-sqlite3` is a native addon and cannot run in the Edge runtime.

### `GET /api/videos`

List all videos ordered by `created_at DESC`.

**Response** `200 Video[]`

```json
[
  {
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
    "local_video_path": "string | null",
    "local_video_filename": "string | null",
    "thumbnail_path": "string | null"
  }
]
```

**Error** `500 { "error": "Internal server error" }`

---

### `POST /api/videos/import`

Import a local video file with transcript. Body is `multipart/form-data`.

**Request fields**

| Field | Type | Required | Notes |
|---|---|---|---|
| `video` | `File` | ✅ | MP4, WebM, or MOV; max 500 MB |
| `title` | `string` | ✅ | Min length 1 (trimmed) |
| `author` | `string` | ❌ | Optional author name |
| `transcript` | `File` | ✅ | Must be `.srt`, `.vtt`, or `.txt` |
| `tags` | `string` | ❌ | **Comma-separated** e.g. `"french,beginner"` |

**Response** `201 Video` on success

**Errors**
- `400 { "error": "Only local video upload is supported" }` — no video file provided
- `400 { "error": "<zod message>" }` — validation failure
- `500 { "error": "Internal server error" }`

**Constants** (from `src/lib/api-schemas.ts`)
```ts
ALLOWED_VIDEO_MIME_TYPES  = ['video/mp4', 'video/webm', 'video/quicktime']
ALLOWED_TRANSCRIPT_FORMATS = ['srt', 'vtt', 'txt']
MAX_VIDEO_SIZE_BYTES       = 524_288_000  // 500 MB
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

**Request fields**

| Field | Type | Required | Notes |
|---|---|---|---|
| `tags` | `string` | ✅ | **JSON-serialized array** e.g. `'["french","beginner"]'` |
| `transcript` | `File` | ❌ | Replacement transcript (`.srt`, `.vtt`, `.txt`) |

**Response**
- `200 Video`
- `400 { "error": "<zod message>" }` — validation failure
- `404 { "error": "Video not found" }`
- `500 { "error": "Internal server error" }`

> ⚠️ **Tags format differs between routes:**
> - `POST /api/videos/import` → comma-separated string: `"french,beginner"`
> - `PATCH /api/videos/[id]` → JSON array string: `'["french","beginner"]'`

---

### `DELETE /api/videos/[id]`

Delete a video record plus all associated files (transcript, video file, thumbnail).

**Response**
- `204` (no body) — deleted
- `404` plain text `"Not Found"`
- `500` plain text `"Internal Server Error"`

---

### `GET /api/videos/[id]/transcript`

Return parsed transcript cues for a video.

**Response** `200`
```json
{ "cues": [{ "index": 1, "startTime": "00:00:01,000", "endTime": "00:00:03,500", "text": "Hello" }] }
```
Returns `{ "cues": [] }` if the video has no transcript.

**Error** `404` plain text `"Not Found"` if video does not exist.

---

### `GET /api/videos/[id]/stream`

Stream the local video file. Supports HTTP range requests for seek/partial playback.

**Request headers**

| Header | Example | Notes |
|---|---|---|
| `Range` | `bytes=0-1048575` | Optional; triggers 206 partial response |

**Response**
- `200` full file with `Content-Type`, `Content-Length`, `Accept-Ranges: bytes`
- `206` partial with `Content-Range: bytes start-end/total`, `Content-Length`, `Content-Type`
- `404` plain text — video not found or file missing
- `500` plain text — server error

Supported MIME types: `video/mp4`, `video/webm`, `video/quicktime`.

---

### `GET /api/videos/[id]/thumbnail`

Return the JPEG thumbnail for a video.

**Response**
- `200 image/jpeg` with `Cache-Control: public, max-age=31536000, immutable`
- `404` (no body) — video not found or thumbnail not yet generated

---

### `GET /api/vocabulary`

List all vocabulary entries from the database, ordered by `word ASC`.

**Response** `200 VocabEntry[]`
```json
[{ "word": "string", "status": "new|learning|mastered", "level": "B2", "definition": "string" }]
```

**Error** `500 { "error": "Internal server error" }`

---

### `PATCH /api/vocabulary/[word]`

Upsert a vocabulary word's status. The `word` path parameter is URL-decoded and lowercased server-side.

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

### `VocabEntry` — `src/lib/vocab-store.ts`

```ts
interface VocabEntry {
  word: string
  status: 'new' | 'learning' | 'mastered'
  level?: string      // CEFR level e.g. 'B2'
  definition?: string
}
```

### `VocabWord` — `src/lib/vocabulary.ts` (mock data type)

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
  thumbnail_path       TEXT                          -- added via addColumnIfMissing
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

**Tags serialization:** `tags` is always `JSON.stringify(string[])` in SQLite and `JSON.parse()` back to `string[]` in `rowToVideo()`. Never serialize manually in callers.

---

## Zod v4 Patterns

> ⚠️ **Breaking change from Zod v3:** `.error.errors` was renamed to `.error.issues`.

```ts
const result = schema.safeParse(input)
if (!result.success) {
  // ✅ Correct for Zod v4
  return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
}
const data = result.data
```

### Schemas in use

| Schema | File | Used by |
|---|---|---|
| `ImportLocalVideoRequestSchema` | `src/lib/api-schemas.ts` | `POST /api/videos/import` |
| `UpdateVideoRequestSchema` | `src/lib/api-schemas.ts` | `PATCH /api/videos/[id]` |
| `UpdateVocabRequestSchema` | `src/lib/api-schemas.ts` | `PATCH /api/vocabulary/[word]` |
| `VideoSchema` | `src/lib/videos.ts` | DB row → `Video` type |
| `InsertVideoParamsSchema` | `src/lib/videos.ts` | Store insert validation |
| `UpdateVideoParamsSchema` | `src/lib/videos.ts` | Store update validation |
| `VocabWordSchema` | `src/lib/vocabulary.ts` | Mock vocabulary data type |

---

## Dependency Injection — Composition Root

`src/lib/server/composition.ts` is the DI root. **Never** instantiate services directly in route handlers.

```ts
import { getContainer } from '@/lib/server/composition'

// Inside a route handler body (not at module scope):
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

Builds a fresh container wired to the given data directory. Pass `':memory:'` for an in-memory SQLite database.

```ts
import { createContainer } from '@/lib/server/composition'

// In tests:
jest.spyOn(composition, 'getContainer').mockReturnValue(createContainer(':memory:'))
```

When `dataDir === ':memory:'`:
- Uses `new Database(':memory:')` (no filesystem I/O)
- Transcript/video writes return virtual paths (`:memory:/transcripts/<id>.<ext>`)
- `ThumbnailTask` is **not** registered (avoids loading ffmpeg)

### `getContainer()` — production singleton

Lazily initialised on first call. Uses `LINGOFLOW_DATA_DIR` env var or falls back to `.lingoflow-data/`.

---

## `VideoStore` Interface — `src/lib/video-store.ts`

```ts
interface VideoStore {
  list(): Video[]
  getById(id: string): Video | undefined
  insert(params: InsertVideoParams): Video
  update(id: string, params: UpdateVideoParams): Video | undefined
  delete(id: string): boolean
}
```

Implementation: `SqliteVideoStore`. All calls are **synchronous** (no `await`).

---

## `VideoService` — `src/lib/video-service.ts`

```ts
class VideoService {
  constructor(store, transcriptStore, videoFileStore)

  // Register a post-import side-effect task (e.g. ThumbnailTask)
  registerPostImportTask(task: PostImportTask): this

  // Run all registered post-import tasks sequentially; patches video record with results
  async drainPostImportTasks(video: Video): Promise<void>

  // Import a local video + transcript; runs post-import tasks after insert
  async importLocalVideo(params: ImportLocalVideoParams): Promise<Video>

  // Update tags and/or replace transcript file
  async updateVideo(id: string, params: UpdateVideoServiceParams): Promise<Video | undefined>

  // Delete video record, transcript file, video file, and thumbnail
  async deleteVideo(id: string): Promise<boolean>
}
```

### `PostImportTask` interface

```ts
interface PostImportTask {
  run(video: Video): Promise<Partial<UpdateVideoParams>>
}
```

`ThumbnailTask` (registered in production) extracts a JPEG thumbnail via ffmpeg and returns `{ thumbnail_path }`.

### `ImportLocalVideoParams`

```ts
interface ImportLocalVideoParams {
  id: string
  title: string
  author_name: string
  video_buffer: Buffer
  video_ext: string           // 'mp4' | 'webm' | 'mov'
  video_filename: string
  transcript_buffer: Buffer
  transcript_ext: string      // 'srt' | 'vtt' | 'txt'
  tags: string[]
  source_type: 'local'
}
```

### `UpdateVideoServiceParams`

```ts
interface UpdateVideoServiceParams {
  tags?: string[]
  transcript_ext?: string
  transcript_buffer?: Buffer
}
```

---

## `VocabStore` Interface — `src/lib/vocab-store.ts`

```ts
interface VocabStore {
  getAll(): VocabEntry[]
  getByWord(word: string): VocabEntry | null
  upsert(word: string, status: VocabEntry['status'], level?: string, definition?: string): VocabEntry
}
```

Implementation: `SqliteVocabStore`. All calls synchronous.

---

## Data Directory — `src/lib/data-dir.ts`

```ts
getDataDir(): string        // LINGOFLOW_DATA_DIR ?? cwd()/.lingoflow-data
getTranscriptsDir(): string // <dataDir>/transcripts
getVideosDir(): string      // <dataDir>/videos
getThumbnailsDir(): string  // <dataDir>/thumbnails
getDbPath(): string         // <dataDir>/lingoflow.db
```

Override the root via `LINGOFLOW_DATA_DIR` environment variable.

---

## better-sqlite3 Patterns

All `better-sqlite3` API calls are **synchronous**:

```ts
import Database from 'better-sqlite3'

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')  // always set WAL mode

// SELECT many
const rows = db.prepare('SELECT * FROM videos ORDER BY created_at DESC').all()

// SELECT one
const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(id)

// INSERT / UPDATE / DELETE
db.prepare('INSERT INTO videos (...) VALUES (...)').run(...values)
db.prepare('UPDATE videos SET tags = ? WHERE id = ?').run(JSON.stringify(tags), id)
db.prepare('DELETE FROM videos WHERE id = ?').run(id)
```

### Additive migration pattern

```ts
const addColumnIfMissing = (column: string, definition: string) => {
  try {
    db.exec(`ALTER TABLE videos ADD COLUMN ${column} ${definition}`)
  } catch { /* already exists — ignore */ }
}
addColumnIfMissing('thumbnail_path', 'TEXT')
```

---

## TanStack React Query v5 Patterns

### Provider setup

```tsx
// src/components/Providers.tsx (wrapped in src/app/layout.tsx)
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

### Query keys in use

| Key | Data type | Source |
|---|---|---|
| `['videos']` | `Video[]` | `GET /api/videos` |
| `['vocabulary']` | `Map<string, VocabEntry>` | `GET /api/vocabulary` |

---

## Custom Hooks

### `useVideos()` — `src/hooks/useVideos.ts`

```ts
const { data: videos = [], isLoading, error } = useVideos()
// Returns UseQueryResult<Video[], Error>
// Fetches GET /api/videos
```

### `useVideoMutations()` — `src/hooks/useVideoMutations.ts`

```ts
const { deleteVideo, refreshVideos } = useVideoMutations()

deleteVideo.mutate(id)                           // DELETE /api/videos/:id + invalidate ['videos']
deleteVideo.mutate(id, { onSuccess: () => ... }) // with callback
refreshVideos()                                  // queryClient.invalidateQueries({ queryKey: ['videos'] })
```

### `useImportVideoForm()` — `src/hooks/useImportVideoForm.ts`

Form state for the import modal. Handles `POST /api/videos/import`.

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

### `useVocabulary()` — `src/hooks/useVocabulary.ts`

```ts
const { data: vocabMap } = useVocabulary()
// Returns UseQueryResult<Map<string, VocabEntry>, Error>
// Fetches GET /api/vocabulary; keyed by word.toLowerCase()
```

### `useUpdateWordStatus()` — `src/hooks/useVocabulary.ts`

```ts
const mutation = useUpdateWordStatus()
mutation.mutate({ word: 'resilient', status: 'mastered' })
// PATCH /api/vocabulary/:word + invalidate ['vocabulary']
// Returns UseMutationResult<VocabEntry, Error, { word, status }>
```

---

## Transcript Utilities

### `parseTranscript(content, format)` — `src/lib/parse-transcript.ts`

```ts
import { parseTranscript, TranscriptCue } from '@/lib/parse-transcript'

const cues: TranscriptCue[] = parseTranscript(fileContent, 'srt')
```

Supported formats: `'srt'`, `'vtt'`, `'txt'` (plain lines, no timestamps).

### `detectPastedTranscriptFormat(text)` — `src/lib/detect-transcript-format.ts`

```ts
import { detectPastedTranscriptFormat } from '@/lib/detect-transcript-format'
const ext = detectPastedTranscriptFormat(text)  // 'vtt' | 'srt' | 'txt'
```

### Transcript file I/O — `src/lib/transcripts.ts`

```ts
writeTranscript(videoId, ext, buffer): string   // writes to getTranscriptsDir(); returns path
deleteTranscript(filePath): void                 // ENOENT silently ignored
```

---

## Next.js App Router Patterns

### Dynamic route `params` must be awaited

`params` is typed as `Promise<{ id: string }>` in Next.js 16:

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

## Testing Patterns

### API route tests require node environment

```ts
// @jest-environment node
```

Default `jsdom` environment lacks `Request`/`Response` globals.

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
