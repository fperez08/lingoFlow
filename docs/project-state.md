# LingoFlow — Project State Snapshot

> Generated for issue #166: Export `createContainer` + `getContainer` for per-test DI isolation.
> Provides everything a coding agent needs to implement that issue without re-exploring the repo.

---

## 1. `src/` File Tree (2 levels deep)

```
src/
├── app/
│   ├── (app)/
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── __tests__/page.test.tsx
│   │   ├── player/
│   │   │   ├── layout.tsx
│   │   │   └── [id]/page.tsx
│   │   └── vocabulary/
│   │       ├── page.tsx
│   │       └── __tests__/page.test.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── videos/
│   │   │   ├── route.ts                         ← GET /api/videos
│   │   │   ├── __tests__/route.test.ts
│   │   │   ├── import/
│   │   │   │   ├── route.ts                     ← POST /api/videos/import
│   │   │   │   └── __tests__/route.test.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts                     ← GET / PATCH / DELETE /api/videos/:id
│   │   │       ├── __tests__/route.test.ts
│   │   │       ├── stream/
│   │   │       │   ├── route.ts
│   │   │       │   └── __tests__/route.test.ts
│   │   │       ├── thumbnail/
│   │   │       │   ├── route.ts
│   │   │       │   └── __tests__/route.test.ts
│   │   │       └── transcript/
│   │   │           ├── route.ts
│   │   │           └── __tests__/route.test.ts
│   │   └── vocabulary/
│   │       ├── route.ts                         ← GET /api/vocabulary
│   │       ├── __tests__/route.test.ts
│   │       └── [word]/
│   │           ├── route.ts                     ← PATCH /api/vocabulary/:word
│   │           └── __tests__/route.test.ts
│   ├── layout.tsx
│   ├── page.tsx                                 ← redirects to /dashboard
│   ├── globals.css
│   └── favicon.ico
├── components/
│   ├── CueText.tsx
│   ├── DarkModeToggle.tsx
│   ├── DeleteVideoModal.tsx
│   ├── EditVideoModal.tsx
│   ├── ImportVideoModal.tsx
│   ├── LessonHero.tsx
│   ├── LocalVideoPlayer.tsx
│   ├── PlaybackProgress.tsx
│   ├── PlayerClient.tsx
│   ├── PlayerLoader.tsx
│   ├── Providers.tsx
│   ├── Sidebar.tsx
│   ├── Toast.tsx
│   ├── TopBar.tsx
│   ├── VideoCard.tsx
│   ├── WordSidebar.tsx
│   └── __tests__/   (*.test.tsx for each component)
├── hooks/
│   ├── useImportVideoForm.ts
│   ├── useVideoMutations.ts
│   ├── useVideos.ts
│   ├── useVocabulary.ts
│   └── __tests__/   (*.test.ts / *.test.tsx)
└── lib/
    ├── api-schemas.ts
    ├── data-dir.ts                              ← Path helpers (added in #165)
    ├── db.ts                                    ← SQLite bootstrap
    ├── detect-transcript-format.ts
    ├── parse-transcript.ts
    ├── thumbnails.ts
    ├── tokenize-transcript.ts
    ├── transcripts.ts
    ├── video-files.ts
    ├── video-service.ts                         ← VideoService business logic
    ├── video-store.ts                           ← SqliteVideoStore CRUD
    ├── videos.ts                                ← Zod schemas + Video types
    ├── vocab-store.ts                           ← SqliteVocabStore CRUD
    ├── vocabulary.ts                            ← MOCK_VOCAB + types
    ├── server/
    │   └── composition.ts                       ← KEY FILE: DI root (singleton)
    └── __tests__/   (unit tests for lib modules)
```

---

## 2. Key Module Summaries

### `src/lib/server/composition.ts` — complete current contents (verbatim)

```ts
/**
 * Production composition root.
 *
 * Data directory is resolved from the LINGOFLOW_DATA_DIR environment variable.
 * If the variable is not set, it defaults to `.lingoflow-data` inside the
 * current working directory (process.cwd()).
 *
 * Example:
 *   LINGOFLOW_DATA_DIR=/var/data/lingoflow pnpm start
 */
import { ensureDataDirs, openDb, initializeSchema } from '@/lib/db'
import { SqliteVideoStore } from '@/lib/video-store'
import { VideoService } from '@/lib/video-service'
import { writeTranscript, deleteTranscript } from '@/lib/transcripts'
import { SqliteVocabStore } from '@/lib/vocab-store'
import { getDataDir, getDbPath, getVideosDir } from '@/lib/data-dir'
import fs from 'fs'
import path from 'path'

function createContainer() {
  const dataDir = getDataDir()
  ensureDataDirs(dataDir)
  const db = openDb(getDbPath())
  initializeSchema(db)

  const store = new SqliteVideoStore(db)
  const vocabStore = new SqliteVocabStore(db)
  const transcriptStore = {
    write: (videoId: string, ext: string, buffer: Buffer) => writeTranscript(videoId, ext, buffer),
    delete: (filePath: string) => deleteTranscript(filePath),
  }
  const videoFileStore = {
    write: (videoId: string, ext: string, buffer: Buffer): string => {
      const videosDir = getVideosDir()
      fs.mkdirSync(videosDir, { recursive: true })
      const filePath = path.join(videosDir, `${videoId}.${ext}`)
      fs.writeFileSync(filePath, buffer)
      return filePath
    },
    delete: (filePath: string): void => {
      try {
        fs.unlinkSync(filePath)
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
      }
    },
  }
  const service = new VideoService(store, transcriptStore, videoFileStore)

  return { videoStore: store, videoService: service, vocabStore }
}

const { videoStore, videoService, vocabStore } = createContainer()

export { videoStore, videoService, vocabStore }
```

**Key observations for #166:**
- `createContainer()` already exists as a local private function — it needs to be exported.
- The module-level singleton is created by calling `createContainer()` at module load time and destructuring into three named exports.
- The return type of `createContainer()` is `{ videoStore: SqliteVideoStore, videoService: VideoService, vocabStore: SqliteVocabStore }`.
- Issue #166 requires: (a) exporting `createContainer` so tests can call it directly to build an isolated container; (b) exporting a `getContainer()` accessor so route handlers (and tests that replace the singleton) can read the current singleton rather than capturing it at import time.
- The backward-compatible approach: keep the named exports `videoStore`, `videoService`, `vocabStore` pointing to the singleton (so existing `jest.mock` tests need zero changes), and additionally export `createContainer` and `getContainer`.

---

### `src/lib/db.ts` — exported functions and signatures

```ts
export function ensureDataDirs(dataDir: string): void
// Creates dataDir, dataDir/transcripts, dataDir/videos, dataDir/thumbnails (all recursive).

export function openDb(dbPath: string): Database.Database
// Opens better-sqlite3 with WAL mode. Returns the DB handle.

export function initializeSchema(db: Database.Database): void
// Creates `videos` and `vocabulary` tables if not present.
// Uses addColumnIfMissing for: source_type, local_video_path, local_video_filename, thumbnail_path.
```

---

### `src/lib/video-store.ts` — class name, constructor, exported interface

```ts
export interface VideoStore {
  list(): Video[]
  getById(id: string): Video | undefined
  insert(params: InsertVideoParams): Video
  update(id: string, params: UpdateVideoParams): Video | undefined
  delete(id: string): boolean
}

export class SqliteVideoStore implements VideoStore {
  constructor(private db: Database.Database) {}
  // Implements all VideoStore methods.
  // Tags are stored as JSON array strings; rowToVideo() deserialises them.
}
```

---

### `src/lib/video-service.ts` — class name, constructor, exported interfaces

```ts
export interface TranscriptStore {
  write(videoId: string, ext: string, buffer: Buffer): string
  delete(filePath: string): void
}

export interface VideoFileStore {
  write(videoId: string, ext: string, buffer: Buffer): string
  delete(filePath: string): void
}

export interface ImportVideoParams { id, title, author_name, thumbnail_url, transcript_ext, transcript_buffer, tags }
export interface ImportLocalVideoParams { id, title, author_name, video_buffer, video_ext, video_filename, transcript_buffer, transcript_ext, tags, source_type: 'local' }
export interface UpdateVideoServiceParams { tags?, transcript_ext?, transcript_buffer? }

export class VideoService {
  constructor(
    private store: VideoStore,
    private transcripts: TranscriptStore,
    private videoFiles: VideoFileStore,
  ) {}

  async importVideo(params: ImportVideoParams): Promise<Video>
  async importLocalVideo(params: ImportLocalVideoParams): Promise<Video>
  async updateVideo(id: string, params: UpdateVideoServiceParams): Promise<Video | undefined>
  async deleteVideo(id: string): Promise<boolean>
}
```

---

### `src/lib/data-dir.ts` — all exported functions (added in #165)

```ts
export function getDataDir(): string
// Returns process.env.LINGOFLOW_DATA_DIR ?? path.join(process.cwd(), '.lingoflow-data')

export function getTranscriptsDir(): string
// Returns path.join(getDataDir(), 'transcripts')

export function getVideosDir(): string
// Returns path.join(getDataDir(), 'videos')

export function getThumbnailsDir(): string
// Returns path.join(getDataDir(), 'thumbnails')

export function getDbPath(): string
// Returns path.join(getDataDir(), 'lingoflow.db')
```

No side effects — pure path derivation. All functions read `process.env.LINGOFLOW_DATA_DIR` at call time, so setting the env var before calling creates an isolated path (useful for test databases).

---

### `src/lib/vocab-store.ts` — class name, constructor, exported interface

```ts
export interface VocabEntry {
  word: string
  status: 'new' | 'learning' | 'mastered'
  level?: string
  definition?: string
}

export interface VocabStore {
  getAll(): VocabEntry[]
  getByWord(word: string): VocabEntry | null
  upsert(word: string, status: VocabEntry['status'], level?: string, definition?: string): VocabEntry
}

export class SqliteVocabStore implements VocabStore {
  constructor(private db: Database.Database) {}
  getAll(): VocabEntry[]
  getByWord(word: string): VocabEntry | null
  upsert(word: string, status: VocabEntry['status'], level?: string, definition?: string): VocabEntry
}
```

---

## 3. Route Handler Test Files

All 8 route test files live at `src/app/api/**/__tests__/route.test.ts`.
All start with `// @jest-environment node` (required because jsdom lacks global `Request`).
All mock `@/lib/server/composition` entirely with `jest.mock(...)`.

### `src/app/api/videos/__tests__/route.test.ts`

**Mocks:**
- `@/lib/server/composition` → `{ videoStore: { list: jest.fn() } }`

**Tests `GET /api/videos`:**
- 200 with video array from `store.list()`
- 500 if `store.list()` throws

---

### `src/app/api/videos/[id]/__tests__/route.test.ts`

**Mocks:**
- `next/server` → custom `MockNextResponse` class with static `json()`
- `@/lib/server/composition` → `{ videoStore: { getById: jest.fn() }, videoService: { deleteVideo: jest.fn(), updateVideo: jest.fn() } }`

**Tests `DELETE /api/videos/[id]`:**
- 404 if `deleteVideo` returns false; 204 on success; verifies `deleteVideo` called with correct id

**Tests `PATCH /api/videos/[id]`:**
- 400 for missing/invalid/non-array tags; 404 if not found; 200 on tags-only update; 200 on transcript replacement; 400 for invalid extension

**Tests `GET /api/videos/[id]`:**
- 404 if video not found; 200 with video data on success

---

### `src/app/api/videos/import/__tests__/route.test.ts`

**Mocks:**
- `@/lib/server/composition` → `{ videoService: { importLocalVideo, updateVideo, deleteVideo }, videoStore: { update } }` (all `jest.fn()`)
- `@/lib/thumbnails` → `{ generateThumbnail: jest.fn().mockResolvedValue(null) }`
- `next/server` → `NextResponse.json` shorthand

**Tests `POST /api/videos/import`:**
- 400 when no video file; 400 when transcript has invalid extension
- 201 on valid local upload — verifies `importLocalVideo` called with correct params
- Thumbnail generation fires-and-forgets; `videoStore.update` called if thumbnail succeeds
- 400 when title missing; 201 with empty tags; 201 with empty author
- 400 when video MIME type unsupported; 400 when video exceeds 500 MB
- 201 for WebM videos

---

### `src/app/api/videos/[id]/transcript/__tests__/route.test.ts`

**Mocks:**
- `next/server` → `MockNextResponse` class
- `@/lib/server/composition` → `{ videoStore: { getById: jest.fn() } }`
- `fs` → full mock

**Tests `GET /api/videos/[id]/transcript`:**
- 404 if video not found
- 200 `{ cues: [] }` when `transcript_path` is null
- 200 with parsed SRT cues (checks text content, cue count, `readFileSync` call path)

---

### `src/app/api/videos/[id]/stream/__tests__/route.test.ts`

**Mocks:**
- `@/lib/server/composition` → `{ videoStore: { getById: jest.fn() } }`
- `fs` → `{ existsSync, statSync, createReadStream }` all `jest.fn()`
- `next/server` → `MockNextResponse` with headers map support
- Polyfills `global.ReadableStream` from `node:stream/web`
- Route imported via `const { GET } = require('../route')` after mocks (avoids hoisting issue)

**Tests `GET /api/videos/[id]/stream`:**
- 404 if video not found; 404 if no `local_video_path`; 404 if file missing on disk
- 200 with correct `Content-Type` for mp4, webm, mov
- 200 with `Accept-Ranges: bytes` header
- 206 with `Content-Range`/`Content-Length` when `Range` header provided
- 206 with end calculated from file size when range end omitted

---

### `src/app/api/videos/[id]/thumbnail/__tests__/route.test.ts`

**Mocks:**
- `@/lib/server/composition` → `{ videoStore: { getById: jest.fn() } }`
- `fs` → `{ readFileSync, existsSync }` both `jest.fn()`
- Polyfills `global.Response` if absent
- Route imported via `const { GET } = require('../route')` after mocks

**Tests `GET /api/videos/[id]/thumbnail`:**
- 404 if video not found; 404 if `thumbnail_path` null; 404 if file read throws
- 200 with `Content-Type: image/jpeg` when thumbnail exists
- `Cache-Control: public, max-age=31536000, immutable` header present

---

### `src/app/api/vocabulary/__tests__/route.test.ts`

**Mocks:**
- `next/server` → `MockNextResponse` with `async json()` method
- `@/lib/server/composition` → `{ vocabStore: { getAll: jest.fn() } }`

**Tests `GET /api/vocabulary`:**
- 200 with all vocab entries
- 500 on store error

---

### `src/app/api/vocabulary/[word]/__tests__/route.test.ts`

**Mocks:**
- `next/server` → `MockNextResponse` with `async json()` method
- `@/lib/server/composition` → `{ vocabStore: { upsert: jest.fn() } }`

**Tests `PATCH /api/vocabulary/[word]`:**
- 200 with upserted entry on valid request
- Decodes and lowercases `word` param (`Hello%20World` → `hello world`)
- 400 for invalid status value
- 500 on store error

---

## 4. Route Handler Files — Composition Import Audit

All 8 route files import named exports from `@/lib/server/composition` at **module scope** (top-level `import` statement). All export `export const runtime = 'nodejs'`.

| Route file | Imports used | runtime line |
|---|---|---|
| `src/app/api/videos/route.ts` | `videoStore` | line 4 |
| `src/app/api/videos/[id]/route.ts` | `videoStore`, `videoService` | line 7 |
| `src/app/api/videos/import/route.ts` | `videoService`, `videoStore` | line 9 |
| `src/app/api/videos/[id]/transcript/route.ts` | `videoStore` | line 7 |
| `src/app/api/videos/[id]/stream/route.ts` | `videoStore` | line 1 |
| `src/app/api/videos/[id]/thumbnail/route.ts` | `videoStore` | line 4 |
| `src/app/api/vocabulary/route.ts` | `vocabStore` | line 4 |
| `src/app/api/vocabulary/[word]/route.ts` | `vocabStore` | line 5 |

**Critical implication for #166:** Because all route handlers import the named exports at module scope, they capture the singleton values at the time the module is first loaded. If `getContainer()` is added and route handlers are updated to call `getContainer().videoStore` inside handler functions (instead of capturing at import time), then swapping the container via `setContainer()` in a test will affect all subsequent handler calls. If the named exports remain (backward compat), existing `jest.mock` tests continue to work unchanged.

---

## 5. Existing Test Infrastructure

### Jest config (`jest.config.js`)

```js
import nextJest from 'next/jest.js'
const createJestConfig = nextJest({ dir: './' })

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',       // default; API route tests override per-file
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/pr-[^/]+/',
  ],
  modulePathIgnorePatterns: ['<rootDir>/pr-[^/]+/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

export default createJestConfig(customJestConfig)
```

### `jest.setup.ts`

```ts
import '@testing-library/jest-dom'
```

Only adds jest-dom matchers. No shared mock helpers, factories, or DI utilities.

### Per-file test patterns used across route tests

| Pattern | Usage |
|---|---|
| `// @jest-environment node` at top of file | Required in all API route tests — jsdom lacks `Request` global |
| `jest.mock('@/lib/server/composition', () => ({ ... }))` | Every route test file mocks the entire composition module |
| `jest.clearAllMocks()` in `afterEach` or `beforeEach` | Consistent across all route test files |
| Inline `MockNextResponse` class | Replicated independently in each test file — no shared helper |
| `require('../route')` after mocks | Used in stream and thumbnail tests to avoid polyfill hoisting issues |

### No shared test utilities for DI

There are **no** existing shared factories, helpers, or fixtures for DI / composition in test code. Each test file independently calls `jest.mock('@/lib/server/composition', ...)` with its own inline shape. This is the pattern that #166 aims to improve upon.

### Relevant lib unit tests (for context)

- `src/lib/__tests__/video-store.test.ts` — real in-memory SQLite, no composition mock.
- `src/lib/__tests__/video-service.test.ts` — mock `VideoStore`, `TranscriptStore`, `VideoFileStore`.
- `src/lib/__tests__/data-dir.test.ts` — tests `getDataDir()` / `getDbPath()` against `process.env.LINGOFLOW_DATA_DIR`.

---

## 6. Design Notes for Issue #166

### Goal

Allow integration-style tests to build a fresh, isolated container (real SQLite in a temp db, real stores) per test — without needing `jest.mock('@/lib/server/composition', ...)`. This enables true DI isolation while keeping existing mock-based tests unchanged.

### Minimal change to `composition.ts`

```ts
// 1. Export createContainer so callers can build a fresh container
export { createContainer }

// 2. Expose a mutable singleton reference
let container = createContainer()

export function getContainer() {
  return container
}

// Optional: setContainer for tests that want to replace the singleton
export function setContainer(c: ReturnType<typeof createContainer>) {
  container = c
}

// 3. Keep named exports for backward compat (existing route handlers + jest.mock tests)
export const videoStore = container.videoStore    // ← still module-scope, but now derived
export const videoService = container.videoService
export const vocabStore = container.vocabStore
```

**Important:** If named exports remain static module-scope references (pointing to the initial singleton's store instances), `setContainer()` won't affect them. For full per-test isolation via `setContainer`, route handlers would need to call `getContainer().videoStore` inside the handler body. That is a larger change; #166 may only require `createContainer` + `getContainer` as the initial step.

### Return type of `createContainer`

```ts
// Inferred from current implementation:
{
  videoStore: SqliteVideoStore   // implements VideoStore
  videoService: VideoService
  vocabStore: SqliteVocabStore   // implements VocabStore
}
```

Tests can import these concrete types from `@/lib/video-store`, `@/lib/video-service`, `@/lib/vocab-store` as needed.

### Pattern for in-process integration tests (after #166)

```ts
// @jest-environment node
import { createContainer } from '@/lib/server/composition'
import Database from 'better-sqlite3'
import { openDb, initializeSchema } from '@/lib/db'

let container: ReturnType<typeof createContainer>

beforeEach(() => {
  // In-memory SQLite — isolated per test
  process.env.LINGOFLOW_DATA_DIR = '/some/test-dir'
  container = createContainer()
})

afterEach(() => {
  // close db if needed
})
```
