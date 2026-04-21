# LingoFlow — Architecture Reference

> **Purpose**: Accurate developer reference for architecture, data flow, patterns, and conventions.
> **Last updated**: 2026-07, HEAD: main.

---

## 1. High-Level Architecture

LingoFlow is a **local-first, single-user Next.js application** (App Router, React 19, TypeScript 5 strict).

```
Browser (React 19 client components)
        ↕  fetch / FormData
Next.js App Router (Node.js runtime)
        ↕  better-sqlite3 (native addon)
SQLite DB  +  local filesystem (transcripts/, videos/, thumbnails/)
```

There is no external backend, no auth, and no cloud storage. All data lives in `.lingoflow-data/` (overridable via `LINGOFLOW_DATA_DIR`).

---

## 2. App Router Layout

```
src/app/
├── layout.tsx              ← Root layout: Providers (React Query), fonts (Manrope, Inter)
├── page.tsx                ← Redirects to /dashboard
├── globals.css
├── (app)/                  ← Route group — adds Sidebar + TopBar shell
│   ├── layout.tsx          ← Renders <Sidebar />, <TopBar />, <main>
│   ├── dashboard/page.tsx  ← "My Library" grid, import/edit/delete modals (client component)
│   ├── player/
│   │   ├── layout.tsx      ← Pass-through (no extra chrome)
│   │   └── [id]/page.tsx   ← Server component — awaits params, delegates to <PlayerLoader>
│   └── vocabulary/page.tsx ← Vocabulary browser (DB-wired via /api/vocabulary)
└── api/
    ├── videos/route.ts                    ← GET  /api/videos
    ├── videos/import/route.ts             ← POST /api/videos/import
    ├── videos/[id]/route.ts               ← GET / PATCH / DELETE /api/videos/:id
    ├── videos/[id]/transcript/route.ts    ← GET  /api/videos/:id/transcript → {cues[]}
    ├── videos/[id]/stream/route.ts        ← GET  /api/videos/:id/stream (byte-range)
    ├── videos/[id]/thumbnail/route.ts     ← GET  /api/videos/:id/thumbnail
    ├── vocabulary/route.ts                ← GET  /api/vocabulary
    └── vocabulary/[word]/route.ts         ← PATCH /api/vocabulary/:word
```

**Critical rule**: every `src/app/api/` file must export `export const runtime = 'nodejs'`.
`better-sqlite3` is a native addon and cannot run in the Edge runtime.

---

## 3. Dependency Injection / Composition Root

All route handlers obtain services through a single composition root.

```ts
// src/lib/server/composition.ts

export interface Container {
  videoStore: SqliteVideoStore
  videoService: VideoService
  vocabStore: SqliteVocabStore
}

// Production: singleton, lazily initialised on first call.
export function getContainer(): Container

// Test/isolation: fresh container wired to any dataDir or ':memory:'.
export function createContainer(dataDir: string): Container
```

**Rules**:
- Route handlers call `getContainer()` **inside** the handler body, never at module scope.
- Never construct `SqliteVideoStore` or `VideoService` directly in route handlers.
- Tests mock via `jest.spyOn(composition, 'getContainer').mockReturnValue(createContainer(':memory:'))`.

**`createContainer` wires up**:
1. `better-sqlite3` DB (WAL mode, schema auto-migrated via `initializeSchema`)
2. `SqliteVideoStore` — CRUD over `videos` table
3. `SqliteVocabStore` — CRUD over `vocabulary` table
4. `TranscriptStore` adapter (filesystem writes/deletes)
5. `VideoFileStore` adapter (filesystem writes/deletes)
6. `VideoService` receiving all three stores
7. `ThumbnailTask` registered as a post-import task (production only; skipped for `:memory:`)

---

## 4. Data Layer

### SQLite Schema (`src/lib/db.ts`)

**`videos` table**

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `title` | TEXT | |
| `author_name` | TEXT | |
| `thumbnail_url` | TEXT | Empty string for local videos |
| `transcript_path` | TEXT | Absolute path on filesystem |
| `transcript_format` | TEXT | `srt` / `vtt` / `txt` |
| `tags` | TEXT | JSON-serialised array `'["a","b"]'` |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |
| `source_type` | TEXT | Always `'local'` |
| `local_video_path` | TEXT NULL | Absolute path (local upload only) |
| `local_video_filename` | TEXT NULL | Original filename |
| `thumbnail_path` | TEXT NULL | Path to ffmpeg-generated thumbnail |

**`vocabulary` table**

| Column | Type | Notes |
|---|---|---|
| `word` | TEXT PK | Lowercase |
| `status` | TEXT | `new` / `learning` / `mastered` |
| `level` | TEXT NULL | CEFR level hint |
| `definition` | TEXT NULL | |
| `created_at` / `updated_at` | TEXT | ISO 8601 |

**Important**: `tags` is always stored as a JSON array string. `SqliteVideoStore.rowToVideo()` deserialises on read. Callers always pass `string[]`; never serialise manually outside the store.

### Data Directory Layout (`src/lib/data-dir.ts`)

```
$LINGOFLOW_DATA_DIR/           (default: .lingoflow-data/)
├── lingoflow.db
├── transcripts/<videoId>.<ext>
├── videos/<videoId>.<ext>
└── thumbnails/<videoId>.jpg
```

Helpers: `getDataDir()`, `getTranscriptsDir()`, `getVideosDir()`, `getThumbnailsDir()`, `getDbPath()`.

---

## 5. Service Layer (`src/lib/video-service.ts`)

`VideoService` owns all business logic. It accepts three store interfaces via constructor injection:

```ts
new VideoService(store: VideoStore, transcripts: TranscriptStore, videoFiles: VideoFileStore)
```

**Key methods**:

| Method | Description |
|---|---|
| `importVideo(params)` | Writes transcript to disk, inserts DB record. Rolls back on failure. |
| `importLocalVideo(params)` | Writes video + transcript, inserts DB record, runs post-import tasks. |
| `updateVideo(id, params)` | Replaces transcript if provided; updates tags. Cleans up old transcript file. |
| `deleteVideo(id)` | Deletes DB record + transcript file + local video file + thumbnail. |

**Post-import task system**:
```ts
service.registerPostImportTask(task: PostImportTask)
// PostImportTask.run(video) → Promise<Partial<UpdateVideoParams>>
```
Currently only `ThumbnailTask` is registered (generates JPEG thumbnail via ffmpeg/ffprobe). Tasks run sequentially after DB insert; failures are logged and do not abort the import.

---

## 6. Data-Fetching Patterns

### React Query (TanStack Query v5) — server state

All server state in the client is managed through React Query. The `QueryClientProvider` is mounted at root in `src/components/Providers.tsx`.

```ts
// Providers.tsx
const [queryClient] = useState(() => new QueryClient())
return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
```

**Query hooks** use `useQuery`; **mutation hooks** use `useMutation` + `queryClient.invalidateQueries`.

### Raw `fetch` in `useEffect` — component-local state (PlayerClient fallback only)

`PlayerClient` contains a `useEffect` fallback that fetches `GET /api/videos/:id/transcript` **only** when the `cues` prop is `undefined`. In the normal render path `PlayerLoader` passes `cues` from `usePlayerData`, so the fetch is not triggered.

`PlayerLoader` does **not** use raw `fetch`. It delegates entirely to `usePlayerData` (React Query via `useQueries`).

---

## 7. Component Hierarchy

### Root shell

```
RootLayout (src/app/layout.tsx)
  └─ Providers (React Query QueryClientProvider)
       └─ AppLayout (src/app/(app)/layout.tsx)
            ├─ Sidebar
            ├─ TopBar (contains DarkModeToggle)
            └─ <main> → route page
```

### Dashboard (`/dashboard`)

```
DashboardPage  [client component, 'use client']
  ├─ useVideos()            ← React Query: GET /api/videos
  ├─ useVideoMutations()    ← React Query: DELETE + cache invalidation
  ├─ VideoCard[]            ← per-video card; callbacks onDelete / onEdit
  ├─ ImportVideoModal       ← controlled by isModalOpen state
  │    └─ useImportVideoForm()   ← useReducer form state + submit handler
  ├─ EditVideoModal         ← controlled by editTarget state
  └─ DeleteVideoModal       ← controlled by deleteTarget state
```

### Player (`/player/[id]`)

```
PlayerPage  [server component]           ← awaits params.id; renders <PlayerLoader id={id} />
  └─ PlayerLoader  [client component]    ← usePlayerData(id): parallel React Query fetch
       │   usePlayerData → useQueries([video, transcript])
       └─ PlayerClient  [client component]   receives video + cues props
            ├─ useVocabulary()            ← React Query: GET /api/vocabulary → Map<string,VocabEntry>
            ├─ useUpdateWordStatus()      ← React Query mutation: PATCH /api/vocabulary/:word
            ├─ LessonHero                 ← title, author, tags, Play button (data-testid="play-button")
            ├─ PlaybackProgress           ← display-only progress bar (shown when mini-player is open)
            ├─ CueText[]                  ← tokenized transcript cues; word-click → WordSidebar
            ├─ LocalVideoPlayer           ← floating <video> mini-player (conditional on isMiniPlayerOpen)
            └─ WordSidebar                ← slide-over word detail panel (conditional on selectedWord)
```

**State in `PlayerClient`**:

| State variable | Type | Purpose |
|---|---|---|
| `cues` | `TranscriptCue[]` | Transcript cues (from prop, or fetched as fallback) |
| `loadingTranscript` | `boolean` | True while fallback fetch is pending |
| `activeCueIndex` | `number` | Selected cue (manual click navigation) |
| `isMiniPlayerOpen` | `boolean` | Controls visibility of `LocalVideoPlayer` |
| `playbackTime` | `{ current: number, duration: number }` | Updated from `LocalVideoPlayer` polling |
| `requestedSeekTime` | `number \| null` | One-shot seek request; cleared by `onSeekApplied` |
| `selectedWord` | `{ word, contextSentence } \| null` | Controls visibility of `WordSidebar` |

**Seek flow**: cue click → `setRequestedSeekTime(startTime)` → `seekToTime` prop on `LocalVideoPlayer` → `useEffect` sets `videoRef.current.currentTime` → `onSeekApplied()` clears `requestedSeekTime`.

### Vocabulary (`/vocabulary`)

```
VocabularyPage  [client component, 'use client']
  ├─ useVocabulary()          ← React Query: GET /api/vocabulary
  └─ (renders vocabulary list with CEFR level grouping)
```

---

## 8. Hook Inventory

| Hook | File | Pattern | Purpose |
|---|---|---|---|
| `useVideos` | `hooks/useVideos.ts` | `useQuery` | Fetches `Video[]` from `GET /api/videos`; query key `['videos']` |
| `useVideoMutations` | `hooks/useVideoMutations.ts` | `useMutation` + `invalidateQueries` | `deleteVideo(id)` mutation; `refreshVideos()` cache invalidation |
| `usePlayerData` | `hooks/usePlayerData.ts` | `useQueries` | Parallel-fetches `Video` + `TranscriptCue[]` for player; returns `{ video, cues, isLoading, error }` |
| `useImportVideoForm` | `hooks/useImportVideoForm.ts` | `useReducer` + `useCallback` | Full import form state machine; submits to `POST /api/videos/import` |
| `useVocabulary` | `hooks/useVocabulary.ts` | `useQuery` | Fetches `VocabEntry[]`; returns `Map<string, VocabEntry>`; query key `['vocabulary']` |
| `useUpdateWordStatus` | `hooks/useVocabulary.ts` | `useMutation` + `invalidateQueries` | `PATCH /api/vocabulary/:word`; invalidates `['vocabulary']` on success |

### `useImportVideoForm` — reducer shape

State is managed with `useReducer` using a discriminated-union action type. Exported for direct unit testing:

```ts
export { initialImportFormState, importFormReducer, State, Action }
```

Action types: `SET_IMPORT_MODE`, `SET_VIDEO_FILE`, `SET_TITLE`, `SET_AUTHOR`, `SET_TRANSCRIPT_MODE`, `SET_TRANSCRIPT_FILE`, `SET_PASTED_TRANSCRIPT`, `SET_TAGS`, `SUBMIT_START`, `SUBMIT_SUCCESS`, `SUBMIT_ERROR`, `RESET`.

---

## 9. API Contract Notes

### Tags encoding differs between endpoints

| Endpoint | `tags` field format |
|---|---|
| `POST /api/videos/import` | Comma-separated string: `"french,beginner"` |
| `PATCH /api/videos/:id` | JSON-serialised array string: `'["french","beginner"]'` |

Both are parsed by Zod schemas in `src/lib/api-schemas.ts`.

### Dynamic route `params` must be awaited (Next.js App Router)

```ts
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

### Zod v4 error access

```ts
result.error.issues[0].message   // ✅ Zod v4
result.error.errors               // ❌ renamed in Zod v4
```

---

## 10. Testing Conventions

### Unit / Integration — Jest 30 + React Testing Library

- **Config**: `jest.config.js`, setup in `jest.setup.ts` (imports `@testing-library/jest-dom`).
- **Default environment**: `jsdom` (set in `jest.config.js`).
- **API route tests** must opt into the Node environment (global `Request` not available in jsdom):
  ```ts
  // @jest-environment node   ← must be first line of file
  ```
- **Mocking the composition root** in route tests:
  ```ts
  jest.mock('@/lib/server/composition', () => ({ getContainer: jest.fn() }))
  ```
- **Reducer testing**: `importFormReducer` is exported as a pure function and tested directly without mounting a component.
- **Component tests** are colocated in `src/components/__tests__/` and `src/app/(app)/**/\__tests__/`.
- **Lib tests** are colocated in `src/lib/__tests__/`.

### E2E — Playwright 1.59

- **Config**: `playwright.config.ts` (Chromium only in CI).
- **Dev server**: auto-started by Playwright's `webServer` config. Reuses existing server on port 3000 if already running.
- **YouTube stub**: `E2E_STUB_YOUTUBE=true` is set by `webServer` config; `src/lib/youtube.ts` returns stub data when this env var is set.
- **Page Object Model (POM)**: all page interactions are encapsulated in `tests/e2e/pages/`:

| POM class | File | Covers |
|---|---|---|
| `DashboardPage` | `pages/DashboardPage.ts` | Navigation, empty/loading state, video card grid |
| `ImportActions` | `pages/ImportActions.ts` | Import modal interactions |
| `EditActions` | `pages/EditActions.ts` | Edit modal interactions |
| `DeleteActions` | `pages/DeleteActions.ts` | Delete modal interactions |
| `PlayerPage` | `pages/PlayerPage.ts` | Player route assertions |
| `VocabularyPage` | `pages/VocabularyPage.ts` | Vocabulary route assertions |

- **Fixtures** (`tests/e2e/fixtures/`): `setupIsolatedDb` / `teardownIsolatedDb` provision a per-test SQLite data directory; `seedVideo` / `seedTranscript` populate it. Sample transcript files: `sample.srt`, `fire-drill.srt`.
- **Specs** (`tests/e2e/*.spec.ts`): each spec covers an independent user flow (import, delete, edit, player, cross-screen).

### Running tests

```bash
pnpm test           # Jest unit tests
pnpm test:e2e       # Playwright E2E (starts dev server automatically)
pnpm build          # TypeScript validation (must pass before merging)
```

---

## 11. Key Invariants

1. `better-sqlite3` is synchronous; all DB calls are blocking. No async DB wrappers.
2. `tags` column always contains a JSON array string. Deserialisation happens only in `rowToVideo()`.
3. `source_type` is always `'local'` — YouTube import was removed.
4. `getContainer()` must be called inside handler bodies, not at module scope (singleton is lazily initialised).
5. All `src/app/api/` files must export `export const runtime = 'nodejs'`.
6. Path alias `@/` maps to `src/`. Use in all imports within `src/`.
