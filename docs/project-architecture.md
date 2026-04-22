# Project Architecture — LingoFlow

> **Last updated:** 2026-04-22
> Generated from codebase state for coding agents.

---

## Quick Navigation

| Layer | Key Files | Purpose |
|-------|-----------|---------|
| **Framework** | `next.config.ts`, `tsconfig.json` | Next.js 16 (App Router), TypeScript 5 strict |
| **Entry Points** | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/(app)/*` | Root layout, provider setup, route groups |
| **API Routes** | `src/app/api/videos/*`, `src/app/api/vocabulary/*` | REST endpoints (Node.js runtime) |
| **Pages** | `src/app/(app)/{dashboard,player,vocabulary}/page.tsx` | Server components fetching data |
| **Components** | `src/components/*.tsx` | React 19 UI (client-side) |
| **Hooks** | `src/hooks/*.ts` | React Query hooks, form state |
| **Services** | `src/lib/video-service.ts`, `src/lib/video-store.ts` | Business logic, DB access |
| **DI Root** | `src/lib/server/composition.ts` | Container factory, singleton pattern |
| **Database** | `src/lib/db.ts`, SQLite (better-sqlite3) | Schema init, migrations |
| **Utilities** | `src/lib/{parse,detect,tokenize}-transcript.ts`, `src/lib/transcripts.ts` | Transcript parsing, file I/O |
| **Tests (Jest)** | `src/**/__tests__/*.test.ts(x)` | Unit + component tests, Node env for API routes |
| **Tests (E2E)** | `tests/e2e/*.spec.ts` | Playwright, Page Object Model |

---

## Core Architecture Patterns

### 1. **Composition Root (DI Container)**
```
@/lib/server/composition.ts
├─ createContainer(dataDir: string) → Container
│  └─ Wires: SqliteVideoStore, VideoService, SqliteVocabStore
└─ getContainer() → Container (singleton, lazy-init)
```
- **Never instantiate services directly** — always use `getContainer()`
- Route handlers import from composition: `import { videoService, videoStore } from '@/lib/server/composition'`
- Tests mock composition with factory: `jest.mock('@/lib/server/composition', () => ({ getContainer: jest.fn() }))`

### 2. **Service Layer**
| Class | Location | Responsibility |
|-------|----------|-----------------|
| `SqliteVideoStore` | `video-store.ts` | SQLite CRUD: `list()`, `getById()`, `insert()`, `update()`, `delete()` |
| `VideoService` | `video-service.ts` | Business logic: import, update, delete; post-import tasks (thumbnails) |
| `SqliteVocabStore` | `vocab-store.ts` | Vocabulary DB: list words, update status (CEFR level tracking) |

### 3. **Data Flow**
```
Client (React hooks) 
  → API route handler 
    → VideoService/VideoStore 
      → SQLite DB | Filesystem (transcripts, videos, thumbnails)
```

### 4. **Database Schema**
- **videos table**: `id, title, author_name, thumbnail_url, transcript_path, transcript_format, tags (JSON), created_at, updated_at, source_type, local_video_path, local_video_filename, thumbnail_path`
- **vocabulary table**: `word (TEXT PRIMARY KEY), cefr_level (TEXT), status (INTEGER)` 
- See `src/lib/db.ts:initializeSchema()` for exact DDL.

### 5. **React Query Architecture**
| Hook | Location | Endpoint | Pattern |
|------|----------|----------|---------|
| `useVideos()` | `hooks/useVideos.ts` | `GET /api/videos` | `useQuery` (list) |
| `useVideoMutations()` | `hooks/useVideoMutations.ts` | `DELETE`, `PATCH` | `useMutation` (delete, refresh) |
| `useImportVideoForm()` | `hooks/useImportVideoForm.ts` | Form state, `POST /api/videos/import` | Custom form hook |
| `usePlayerData()` | `hooks/usePlayerData.ts` | `GET /api/videos/:id`, transcript | `useQueries` (parallel) |
| `useVocabulary()` | `hooks/useVocabulary.ts` | `GET /api/vocabulary` | `useQuery` (vocab list) |

### 6. **Next.js App Router Routes**

#### Page Routes (Server Components)
| Route | File | Behavior |
|-------|------|----------|
| `/` | `app/page.tsx` | Redirects to `/dashboard` |
| `/dashboard` | `app/(app)/dashboard/page.tsx` | Server → fetches all videos, renders `<DashboardClient>` |
| `/player/[id]` | `app/(app)/player/[id]/page.tsx` | Server → fetches video + transcript, renders `<PlayerClient>` |
| `/vocabulary` | `app/(app)/vocabulary/page.tsx` | Server → fetches vocab list, renders `<VocabularyClient>` |

#### API Routes (Node.js Runtime)
| Method | Route | Handler | Query Params | Body |
|--------|-------|---------|--------------|------|
| `GET` | `/api/videos` | Lists all videos | — | — |
| `POST` | `/api/videos/import` | Import video + transcript | — | `FormData: file, title, author_name, tags (comma-sep), thumbnail_url` |
| `GET` | `/api/videos/[id]` | Fetch single video | — | — |
| `PATCH` | `/api/videos/[id]` | Update video metadata | — | `FormData: tags (JSON array string), transcript_path, transcript_format` |
| `DELETE` | `/api/videos/[id]` | Delete video + cleanup | — | — |
| `GET` | `/api/videos/[id]/transcript` | Parse transcript to cues | — | — |
| `GET` | `/api/videos/[id]/stream` | Stream video (if local) | — | — |
| `GET` | `/api/videos/[id]/thumbnail` | Serve/generate thumbnail | — | — |
| `GET` | `/api/vocabulary` | List vocabulary | — | — |
| `PATCH` | `/api/vocabulary/[word]` | Update word status | — | `FormData: status (CEFR level)` |

### 7. **Component Tree**
```
<Providers>  (React Query, dark mode)
  <Root Layout>
    ├─ Sidebar
    ├─ TopBar
    ├─ Routes
    │  ├─ /dashboard → <DashboardClient> 
    │  │  ├─ VideoCard (grid)
    │  │  ├─ ImportVideoModal
    │  │  ├─ EditVideoModal
    │  │  └─ DeleteVideoModal
    │  ├─ /player/[id] → <PlayerClient>
    │  │  ├─ LocalVideoPlayer (or iframe for URLs)
    │  │  ├─ CueText (transcript display)
    │  │  └─ WordSidebar (vocabulary words)
    │  └─ /vocabulary → <VocabularyClient>
    │     └─ WordCard (word list)
    └─ Toast (notifications)
```

---

## Key Conventions & Patterns

### ✅ Must Follow

1. **API routes require Node.js runtime**
   ```ts
   export const runtime = 'nodejs'
   ```
   - `better-sqlite3` is native module; Edge runtime will fail.

2. **API route tests need `@jest-environment node`**
   ```ts
   /** @jest-environment node */  // Block comment form (NOT // comment)
   ```
   - Default `jsdom` env lacks global `Request`.

3. **Dynamic route params must be awaited**
   ```ts
   export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
     const { id } = await params
     // ...
   }
   ```

4. **Zod v4 error access**
   ```ts
   const result = SomeSchema.safeParse(data)
   if (!result.success) {
     const message = result.error.issues[0].message  // NOT .errors
   }
   ```

5. **Tags API contract differs**
   - `POST /api/videos/import`: `tags` is **comma-separated string** (`"french,beginner"`)
   - `PATCH /api/videos/[id]`: `tags` is **JSON-serialized array string** (`'["french","beginner"]'`)
   - See `src/lib/api-schemas.ts` for exact Zod schemas.

6. **Tags stored as JSON in SQLite**
   - `tags` column = `'["tag1","tag2"]'` (JSON string)
   - `SqliteVideoStore.rowToVideo()` deserializes to `string[]`
   - Never serialize manually in callers.

7. **Use composition root in route handlers**
   ```ts
   import { videoService, videoStore } from '@/lib/server/composition'
   // Never: new SqliteVideoStore(db)
   ```

8. **Mock composition in tests**
   ```ts
   jest.mock('@/lib/server/composition', () => ({
     ...jest.requireActual('@/lib/server/composition'),
     getContainer: jest.fn(),
   }))
   ```
   - SWC makes exports non-configurable; `jest.spyOn()` will throw.

9. **Mock fs in tests with `jest.requireActual`**
   ```ts
   jest.mock('fs', () => ({
     ...jest.requireActual('fs'),
     readFileSync: jest.fn(),
   }))
   ```
   - `better-sqlite3` needs real fs for backup operations.

### 📁 File Organization

```
src/
  app/
    (app)/                          # Route group — shared Sidebar + TopBar
      layout.tsx
      dashboard/page.tsx            # Server → fetches videos
      player/[id]/page.tsx          # Server → fetches video + transcript
      vocabulary/page.tsx           # Server → fetches vocab
    api/
      videos/
        route.ts                    # GET /api/videos, POST creates import form
        import/route.ts             # POST /api/videos/import
        [id]/
          route.ts                  # GET, PATCH, DELETE /api/videos/:id
          transcript/route.ts       # GET → parsed transcript cues
          stream/route.ts           # GET → video file stream
          thumbnail/route.ts        # GET/POST → thumbnail
      vocabulary/
        route.ts                    # GET /api/vocabulary
        [word]/route.ts             # PATCH /api/vocabulary/:word
    layout.tsx                      # Root layout, Providers
    page.tsx                        # Redirects to /dashboard
  components/
    *.tsx                           # UI components, all client-side
  hooks/
    *.ts                            # React Query hooks
  lib/
    server/
      composition.ts                # DI container (SINGLETON)
    videos.ts                       # Zod schemas: Video, InsertVideoParams, UpdateVideoParams
    video-store.ts                  # SqliteVideoStore interface + impl
    video-service.ts                # VideoService (import, update, delete)
    vocab-store.ts                  # SqliteVocabStore
    db.ts                           # SQLite helpers (openDb, initializeSchema)
    api-schemas.ts                  # Zod schemas for API request bodies
    api-client.ts                   # Fetch wrapper for client-side
    parse-transcript.ts             # parseSrt, parseVtt, parseTxt → TranscriptCue[]
    detect-transcript-format.ts     # Detect .srt/.vtt/.txt from filename/content
    tokenize-transcript.ts          # Split transcript into words (vocabulary)
    transcripts.ts                  # writeTranscript, deleteTranscript (I/O)
    data-dir.ts                     # getDataDir(), getVideosDir(), getThumbnailsDir()
    thumbnails.ts                   # Thumbnail extraction via ffmpeg
    video-files.ts                  # Local video file handling
    youtube.ts                      # fetchYoutubeMetadata, extractYoutubeId, E2E stub map
    vocabulary.ts                   # MOCK_VOCAB, VOCAB_LEVELS
    tasks/
      thumbnail-task.ts             # Post-import task: extract thumbnails
    __tests__/
      *.test.ts                     # Library unit tests
tests/
  e2e/
    *.spec.ts                       # Playwright E2E tests
    pages/                          # Page Object Model classes
    fixtures/                       # Test data, factories
```

---

## Build & Test Commands

| Command | Purpose | Runtime |
|---------|---------|---------|
| `pnpm install` | Sync dependencies | — |
| `pnpm build` | Production build (validates TS) | — |
| `pnpm dev` | Dev server on `http://localhost:3000` | — |
| `pnpm test` | Jest unit + component tests | jsdom (default) + node (api routes) |
| `pnpm test:e2e` | Playwright E2E (auto-starts dev server) | Chromium |
| `pnpm lint` | ESLint (pre-existing failures in tests, NOT a CI gate) | — |

**Note:** `pnpm build` uses `--webpack` (not Turbopack) because Turbopack requires native SWC bindings not available in the dev container.

---

## Critical Warnings ⚠️

1. **Never remove `allowBuilds: { better-sqlite3: true }` from `pnpm-workspace.yaml`**
   - `better-sqlite3` is a native addon; pnpm must build it during install.

2. **Never use Edge runtime for API routes**
   - `better-sqlite3` is native; Edge runtime will crash.

3. **Zod v4 error handling is `result.error.issues`, NOT `result.error.errors`**
   - Will cause runtime crashes if wrong property is used.

4. **Mock composition with factory, NOT `jest.spyOn()`**
   - SWC compiles exports as non-configurable; `jest.spyOn()` will throw.

5. **Always await `params` in dynamic route handlers**
   - Next.js 16 types `params` as `Promise<...>`; forgetting `await` causes type errors.

6. **Tags API contract mismatch**
   - Import expects comma-separated string, PATCH expects JSON array string.
   - Mixing them will cause validation errors or data loss.

---

## Imports & Path Alias

Use `@/` alias (configured in `tsconfig.json`):
```ts
import { videoService } from '@/lib/server/composition'
import { useVideos } from '@/hooks/useVideos'
import { VideoCard } from '@/components/VideoCard'
```

Never use relative paths from `src/`.

---

## Data Directory & Environment

- **Default data dir:** `.lingoflow-data/` (gitignored)
- **Override:** Set `LINGOFLOW_DATA_DIR=/custom/path`
- **Contains:**
  - `lingoflow.db` — SQLite database
  - `transcripts/` — `.srt`/`.vtt`/`.txt` files
  - `videos/` — Local video files (if imported with video)
  - `thumbnails/` — Extracted JPEG thumbnails

---

## Dark Mode Design System

- **Strategy:** `class` (Tailwind dark mode via `dark:` prefix)
- **Color tokens (custom):** `primary`, `surface`, `on-surface`, `surface-container`, `outline-variant`
- **See:** `tailwind.config.ts:11-67` for full token list

---

## Testing Fixtures & Utilities

- **Fixtures:** `tests/e2e/fixtures/` (sample SRT, factory functions)
- **E2E POM:** `tests/e2e/pages/` (DashboardPage, PlayerPage, etc.)
- **Jest setup:** `jest.setup.ts` (registers Testing Library matchers)
- **E2E stub:** `E2E_STUB_YOUTUBE=true` (auto-set by Playwright config)

---

## CI Pipeline

Defined in `.github/workflows/e2e.yml`:
1. Runs **on push to main only** (post-merge, not PR)
2. Steps: `pnpm install --frozen-lockfile` → `pnpm test` → `pnpm test:e2e`
3. **No lint step** in CI (pre-existing lint errors in tests; do not fix)

---

## Common Gotchas

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| "Cannot find module better-sqlite3" | Native addon not built | Run `pnpm install` |
| "params is not awaited" | TS strict mode | Add `await params` in dynamic route |
| "Cannot redefine property" in tests | Mock composition with spyOn | Use factory: `jest.mock('@/lib/server/composition', ...)` |
| "Request is not defined" | Test env is jsdom, not node | Add `/** @jest-environment node */` to API route tests |
| ".errors is undefined" | Zod v4 API changed | Use `result.error.issues[0].message` |
| Tags validation fails | Format mismatch (import vs PATCH) | Check `api-schemas.ts` for correct format |
| Thumbnail extraction fails | ffmpeg not installed | Build includes `@ffmpeg-installer/ffmpeg` |
