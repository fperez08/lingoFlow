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

**Never** instantiate services directly in route handlers. Use `getContainer()` from the composition root — called **inside** handler bodies, never at module scope:

```ts
import { getContainer } from '@/lib/server/composition'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { videoStore } = getContainer()
  // ...
}
```

### `Container` interface

```ts
interface Container {
  videoStore: SqliteVideoStore
  videoService: VideoService
  vocabStore: SqliteVocabStore
}
```

`createContainer(dataDir)` builds a fresh container for tests; `':memory:'` uses in-memory SQLite.

### `VideoService` Methods

```ts
class VideoService {
  registerPostImportTask(task: PostImportTask): this
  async drainPostImportTasks(video: Video): Promise<void>
  async importLocalVideo(params: ImportLocalVideoParams): Promise<Video>
  async updateVideo(id: string, params: UpdateVideoServiceParams): Promise<Video | undefined>
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
| `['vocabulary']` | `Map<string, VocabEntry>` |
| `['videos', id]` | Single `Video` (via `queryKeys.video(id)`) |
| `['transcript', id]` | `TranscriptCue[]` (via `queryKeys.transcript(id)`) |

### `useQueries` (parallel fetch)

```ts
import { useQueries } from '@tanstack/react-query'

const [videoResult, transcriptResult] = useQueries({
  queries: [
    { queryKey: queryKeys.video(id),      queryFn: () => apiClient.getVideo(id) },
    { queryKey: queryKeys.transcript(id), queryFn: () => apiClient.getTranscript(id) },
  ],
})
```

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

Form state manager for the import modal. Uses `useReducer` internally. Handles validation, file detection, and `POST /api/videos/import` submission.

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

The underlying reducer is exported for unit testing:
```ts
import { importFormReducer, initialImportFormState } from '@/hooks/useImportVideoForm'
// Test the pure reducer directly without mounting a component
const next = importFormReducer(initialImportFormState, { type: 'SET_TITLE', payload: 'Hello' })
```

### `usePlayerData()` — `src/hooks/usePlayerData.ts`

```ts
const { video, cues, isLoading, error } = usePlayerData(id)
// Parallel-fetches video + transcript via useQueries
// Returns: { video: Video | undefined, cues: TranscriptCue[] | undefined, isLoading, error }
```

### `useVocabulary()` — `src/hooks/useVocabulary.ts`

```ts
const { data: vocabMap = new Map() } = useVocabulary()
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
  getContainer: jest.fn().mockReturnValue({
    videoStore: { list: jest.fn(), getById: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() },
    videoService: { importLocalVideo: jest.fn(), updateVideo: jest.fn(), deleteVideo: jest.fn() },
    vocabStore: { getAll: jest.fn(), getByWord: jest.fn(), upsert: jest.fn() },
  }),
}))
```

### In-memory Integration Tests

```ts
import { createContainer } from '@/lib/server/composition'
import * as composition from '@/lib/server/composition'

jest.spyOn(composition, 'getContainer').mockReturnValue(createContainer(':memory:'))
// ':memory:' → no filesystem I/O; ThumbnailTask not registered
```

### Component Tests — React Testing Library

Components are tested with `render` / `screen` / `fireEvent` / `waitFor` from `@testing-library/react`.

```ts
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import MyComponent from '../MyComponent'

// Render and query
render(<MyComponent prop="value" />)
screen.getByText('Expected text')          // throws if not found
screen.queryByText('Optional')             // returns null if absent
screen.getByTestId('some-id')
screen.getByRole('button', { name: 'Play video' })

// Events
fireEvent.click(screen.getByTestId('play-button'))
fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new text' } })

// Async — wait for state updates / effects
await waitFor(() => expect(screen.getByText('Loaded')).toBeInTheDocument())
await act(async () => { fireEvent.click(button) })

// Assertions (jest-dom)
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toHaveAttribute('src', '/api/videos/x/thumbnail')
expect(element).toHaveClass('rounded-full')
expect(element.className).toMatch(/rounded-full/)
expect(element).toHaveTextContent('Hello')
```

### Mocking React Hooks

```ts
jest.mock('@/hooks/useVocabulary', () => ({
  useVocabulary: () => ({ data: new Map(), isLoading: false }),
  useUpdateWordStatus: () => ({ mutate: jest.fn(), isPending: false }),
}))
```

### Mocking Child Components

```ts
// Variable MUST start with "mock" to satisfy babel-jest hoisting rules
let mockCapturedOnClose: (() => void) | undefined

jest.mock('@/components/LocalVideoPlayer', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: () => void }) => {
    mockCapturedOnClose = onClose
    return <div data-testid="mini-player"><button onClick={onClose}>Close</button></div>
  },
}))
```

### Mocking `fetch`

```ts
beforeEach(() => {
  global.fetch = jest.fn()
})
afterEach(() => {
  jest.resetAllMocks()
})

// Mock a successful response
;(global.fetch as jest.Mock).mockResolvedValueOnce({
  json: async () => ({ cues: [] }),
  ok: true,
} as Response)
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

## React 19 Component Patterns

### Server vs Client Components

```ts
// Server component (default in App Router) — no directive needed
export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PlayerLoader id={id} />
}

// Client component — must opt in with directive at top of file
'use client'
import { useState } from 'react'

export default function DashboardPage() {
  const [open, setOpen] = useState(false)
  // ...
}
```

### Rules for Client Components

- Must have `'use client'` as the **first line** (before any imports)
- Can use hooks (`useState`, `useEffect`, `useReducer`, `useRef`, etc.)
- Can handle browser events
- Can import other client components freely
- Can import server-side utilities only if they don't use Node.js-only APIs

### Rules for Server Components

- Default in App Router (no directive needed)
- Cannot use React hooks
- Cannot handle browser events
- Can `async/await` directly (e.g., `await params`, DB calls via service layer)
- Pass data down to client components as props

### `useEffect` for Data Fetching (client-local state)

When data is component-local and not in React Query cache, use raw `fetch` + `useEffect`:

```ts
'use client'
import { useEffect, useState } from 'react'

function PlayerClient({ videoId }: { videoId: string }) {
  const [cues, setCues] = useState<TranscriptCue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/videos/${videoId}/transcript`)
      .then((r) => r.json())
      .then((data) => setCues(data.cues ?? []))
      .catch(() => setCues([]))
      .finally(() => setLoading(false))
  }, [videoId])
  // ...
}
```

### `useRef` for Imperative DOM / Media APIs

```ts
const videoRef = useRef<HTMLVideoElement>(null)

// In event handler or effect:
videoRef.current?.play()
videoRef.current?.pause()
if (videoRef.current) {
  videoRef.current.currentTime = seekTime
  videoRef.current.playbackRate = 1.5
}

// In JSX:
<video ref={videoRef} src={`/api/videos/${id}/stream`} autoPlay />
```

### `useReducer` Form State Pattern

Used by `useImportVideoForm` for complex form state with multiple fields:

```ts
type Action =
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; payload: string }
  | { type: 'RESET' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_TITLE': return { ...state, title: action.payload }
    case 'SUBMIT_START': return { ...state, isSubmitting: true, submitError: null }
    case 'SUBMIT_SUCCESS': return { ...initialState }
    case 'SUBMIT_ERROR': return { ...state, isSubmitting: false, submitError: action.payload }
    default: return state
  }
}

function useMyForm() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const setTitle = useCallback((t: string) => dispatch({ type: 'SET_TITLE', payload: t }), [])
  // ...
}
```

---

## Tailwind CSS Design System

LingoFlow uses a **Material Design 3-inspired color system** with custom Tailwind tokens. All colors are defined in `tailwind.config.ts`.

### Primary Palette

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#006071` | Buttons, links, active states, tag text |
| `on-primary` | `#ffffff` | Text/icons on primary background |
| `primary-container` | `#007b8f` | Elevated primary surface |
| `on-primary-container` | `#e3f9ff` | Text on primary container |
| `inverse-primary` | `#7ad3e9` | Dark mode primary |

### Surface Palette

| Token | Usage |
|---|---|
| `surface` | Page background (`#f7f9fb`) |
| `surface-container-low` | Slightly elevated panels |
| `surface-container` | Cards, modals |
| `surface-container-high` | Thumbnails, input backgrounds |
| `surface-variant` | Borders, dividers |

### Content / Text Tokens

| Token | Usage |
|---|---|
| `on-surface` | Primary text on surface (`#191c1e`) |
| `on-surface-variant` | Secondary / muted text (`#3e484b`) |
| `outline` | Default borders (`#6e797c`) |
| `outline-variant` | Subtle borders (`#bec8cc`) |
| `error` | Error states (`#ba1a1a`) |
| `on-error-container` | Error text (`#93000a`) |

### Dark Mode

Dark mode uses `class` strategy. Apply dark variants with `dark:` prefix:

```tsx
<div className="bg-surface dark:bg-slate-900 text-on-surface dark:text-slate-100">
  <p className="text-on-surface-variant dark:text-slate-400">Muted text</p>
</div>
```

### Typography Tokens

| Token | Font | Usage |
|---|---|---|
| `font-headline` | Manrope | Headings, hero text |
| `font-body` | Inter | Body copy |
| `font-label` | Inter | Labels, captions |

### Common Layout Patterns

```tsx
// Card / panel
<div className="rounded-2xl bg-surface-container-low border border-outline-variant/30 overflow-hidden">

// Section max-width
<section className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">

// Tag chip
<span className="text-[10px] font-bold uppercase tracking-wider text-primary">
  {tag}
</span>

// Empty state
<div className="flex flex-col items-center justify-center py-12 text-center gap-3">
  <span className="text-3xl">📄</span>
  <p className="text-on-surface font-semibold">No items</p>
  <p className="text-sm text-on-surface-variant">Descriptive hint</p>
</div>
```

### Media Control Button Patterns

Inline SVG icons inside circular buttons — used by `LocalVideoPlayer`:

```tsx
{/* Icon control button — standard size */}
<button
  onClick={handleAction}
  aria-label="Descriptive label"
  data-testid="my-button"
  className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 text-white transition"
>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    {/* SVG path */}
  </svg>
</button>

{/* Play/pause button — larger primary control */}
<button
  onClick={handlePlayPause}
  aria-label={isPlaying ? 'Pause' : 'Play'}
  data-testid="mini-player-play-pause"
  className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
>
  {isPlaying ? (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/> {/* Pause */}
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M8 5v14l11-7z"/> {/* Play */}
    </svg>
  )}
</button>

{/* Close button — floating overlay */}
<button
  onClick={handleClose}
  aria-label="Close"
  className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white text-sm transition"
>
  ✕
</button>

{/* Compact play button — white circle on dark thumbnail */}
<div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-primary shadow-xl">▶</div>

{/* Speed selector */}
<select
  aria-label="Playback speed"
  className="text-white bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-white/30"
>
  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
    <option key={s} value={s}>{s}×</option>
  ))}
</select>
```

### Hover / Group Patterns

```tsx
{/* group-hover shows overlay + action buttons on card */}
<div className="group cursor-pointer">
  <div className="relative rounded-xl overflow-hidden transition-all group-hover:-translate-y-1">
    {/* hover overlay */}
    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
      ...
    </div>
    {/* action buttons only visible on hover */}
    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      ...
    </div>
  </div>
</div>
```

### Mini-Player Layout

The mini-player floats bottom-right on mobile, top-right on desktop:

```tsx
<div className="fixed bottom-4 right-4 z-50 w-80 shadow-2xl rounded-xl overflow-hidden bg-black md:bottom-auto md:top-20">
  <div className="relative aspect-video">
    <video ... />
  </div>
  {/* Transport controls bar */}
  <div className="flex items-center justify-between gap-1 px-3 py-2 bg-gray-900">
    {/* rewind / play-pause / fast-forward / speed */}
  </div>
</div>
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

// src/lib/tokenize-transcript.ts
interface WordToken  { type: 'word';  value: string }
interface PunctToken { type: 'punct'; value: string }
type TranscriptToken = WordToken | PunctToken
// tokenizeCueText(text: string): TranscriptToken[]

// src/lib/vocab-store.ts
interface VocabEntry {
  word: string
  status: 'new' | 'learning' | 'mastered'
  level?: string      // CEFR e.g. 'B2'
  definition?: string
}

// src/lib/vocabulary.ts (mock data type)
type VocabWord = { id: string; word: string; level: 'A1'|'A2'|'B1'|'B2'|'C1'|'C2'; definition: string; contextQuote: string; source: string; status: 'new'|'learning'|'mastered' }
```
