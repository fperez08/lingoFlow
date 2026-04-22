# Project Overview — LingoFlow

> **Last updated:** 2026-04-22
> One-shot summary for coding agents: what it is, how it works, key entry points.

---

## What Is LingoFlow?

**LingoFlow** is a local-first, single-user Next.js web app for importing YouTube videos or local video files with transcript files (`.srt`, `.vtt`, `.txt`), syncing video playback with transcript display, editing tags/metadata, and browsing vocabulary with word status tracking.

- **No cloud backend** — all data stored locally in SQLite (`.lingoflow-data/lingoflow.db`)
- **No authentication** — single-user app
- **Local-first** — transcripts, videos, thumbnails stored on local filesystem
- **Vocabulary tracking** — mark words as learned (CEFR levels A1–C2) in database
- **React 19 + TypeScript 5** — strict mode enabled
- **App Router** — Next.js 16.2.3 (no Pages directory)
- **Video processing** — thumbnails extracted via ffmpeg on import

---

## Quick Start for Developers

```bash
# Install dependencies (pnpm ONLY)
pnpm install

# Development
pnpm dev                  # http://localhost:3000

# Validation
pnpm build                # Production build (validates TypeScript)
pnpm test                 # Jest unit + component tests
pnpm test:e2e             # Playwright E2E tests
pnpm lint                 # ESLint (pre-existing test failures, NOT a CI gate)
```

**Never use npm/yarn** — pnpm required for `better-sqlite3` native addon.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 16.2.3 |
| **UI** | React + Tailwind CSS | 19.2.4 / 3.4.19 |
| **Language** | TypeScript | ^5 (strict: true) |
| **Database** | SQLite via better-sqlite3 | 12.8.0 |
| **State** | TanStack React Query | 5.96.2 |
| **Validation** | Zod | 4.3.6 |
| **Video Processing** | fluent-ffmpeg | 2.1.3 |
| **Testing (Unit)** | Jest + Testing Library | 30.3.0 |
| **Testing (E2E)** | Playwright | 1.59.1 |
| **Package Manager** | pnpm | (latest) |
| **Node Runtime** | Node.js | 24 |

---

## Module Ownership & Responsibilities

| Module | Exports | Owned By |
|--------|---------|----------|
| **`@/lib/server/composition.ts`** | `getContainer()`, `createContainer()` | DI Root — wires all services |
| **`@/lib/video-store.ts`** | `SqliteVideoStore` | Database CRUD layer |
| **`@/lib/video-service.ts`** | `VideoService` | Business logic (import, update, delete) |
| **`@/lib/vocab-store.ts`** | `SqliteVocabStore` | Vocabulary DB operations |
| **`@/lib/videos.ts`** | `VideoSchema`, `Video` type | Zod validation + TypeScript types |
| **`@/lib/db.ts`** | `openDb()`, `initializeSchema()` | SQLite connection + schema |
| **`@/lib/api-schemas.ts`** | Request body schemas | Zod validation for API routes |
| **`@/lib/parse-transcript.ts`** | `parseSrt()`, `parseVtt()`, `parseTxt()` | Transcript file parsing |
| **`@/lib/transcripts.ts`** | `writeTranscript()`, `deleteTranscript()` | Transcript file I/O |
| **`@/lib/data-dir.ts`** | `getDataDir()`, `getVideosDir()` | Data directory management |
| **`@/lib/youtube.ts`** | `fetchYoutubeMetadata()` | YouTube oEmbed API (E2E stubbed) |
| **`@/lib/vocabulary.ts`** | `MOCK_VOCAB`, `VOCAB_LEVELS` | Mock vocabulary data |
| **`@/hooks/useVideos.ts`** | `useVideos()` | React Query: list videos |
| **`@/hooks/useVideoMutations.ts`** | `useVideoMutations()` | React Query: delete, refresh |
| **`@/hooks/usePlayerData.ts`** | `usePlayerData()` | Fetch video + transcript |
| **`@/hooks/useVocabulary.ts`** | `useVocabulary()` | Fetch vocabulary |
| **`@/components/VideoCard.tsx`** | `VideoCard` | Display single video in grid |
| **`@/components/PlayerClient.tsx`** | `PlayerClient` | Main player UI (no vocab tab) |
| **`@/components/ImportVideoModal.tsx`** | `ImportVideoModal` | Import video form + submit |
| **`@/components/EditVideoModal.tsx`** | `EditVideoModal` | Edit video metadata |
| **`@/components/DeleteVideoModal.tsx`** | `DeleteVideoModal` | Confirm delete |

---

## Core Runtime Behavior

### 1. **On App Start**
```
Next.js server loads layout.tsx
  → Providers wrap app (React Query, dark mode)
  → Sidebar + TopBar rendered
  → Routes mounted
```

### 2. **On Page Load (/dashboard)**
```
Server component fetches: GET /api/videos
  → videoStore.list() queries SQLite
  → Returns Video[] with tags deserialized from JSON
  → Renders grid of VideoCard components
```

### 3. **On Import Video**
```
User: upload file + title + transcript
  → POST /api/videos/import
    → VideoService.import() called
      → Validates FormData (tags comma-sep)
      → Stores transcript file: .lingoflow-data/transcripts/{id}.srt
      → Stores video (if local): .lingoflow-data/videos/{id}.mp4
      → Inserts record in SQLite (tags as JSON string)
      → Runs post-import tasks (ThumbnailTask extracts JPEG)
    → Returns created Video
  → React Query invalidates cache
  → Grid refreshes with new video
```

### 4. **On Play Video**
```
User clicks video → navigates to /player/{id}
  → Server fetches: GET /api/videos/{id} + GET /api/videos/{id}/transcript
    → Renders PlayerClient with video player + transcript
    → React player syncs video time ↔ highlighted cue
    → User can click word → sees definition (mock data)
```

### 5. **On Edit Video**
```
User clicks edit → EditVideoModal opens
  → PATCH /api/videos/{id}
    → VideoService.update() called
      → Validates FormData (tags JSON array string)
      → Updates SQLite record
    → React Query invalidates cache
  → Grid refreshes
```

### 6. **On Browse Vocabulary**
```
User navigates /vocabulary
  → Server fetches: GET /api/vocabulary
    → VocabStore queries SQLite
    → Returns populated VocabEntry[] (loaded from DB)
  → Renders vocabulary list with status tracking
  → User can mark words as learned (status → CEFR level)
  → PATCH /api/vocabulary/{word}
    → VocabStore updates word status in SQLite
```

---

## Data Model

### **videos table**
```sql
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author_name TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  transcript_path TEXT NOT NULL,
  transcript_format TEXT NOT NULL,      -- 'srt' | 'vtt' | 'txt'
  tags TEXT NOT NULL,                   -- JSON: ["tag1","tag2"]
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  source_type TEXT DEFAULT 'local',     -- 'local' only (YouTube removed)
  local_video_path TEXT,                -- Full path to .mp4 / .mkv
  local_video_filename TEXT,            -- Filename only
  thumbnail_path TEXT
)
```

### **vocabulary table**
```sql
CREATE TABLE vocabulary (
  word TEXT PRIMARY KEY,
  cefr_level TEXT NOT NULL,             -- A1, A2, B1, B2, C1, C2
  status INTEGER DEFAULT 0              -- 0=not learned, 1=learning, 2=learned
)
```

### **Type Hierarchy**
```ts
Video {
  id: string
  title: string
  author_name: string
  thumbnail_url: string
  transcript_path: string
  transcript_format: 'srt' | 'vtt' | 'txt'
  tags: string[]                        -- Array (deserialized from JSON)
  created_at: string
  updated_at: string
  source_type: 'local'
  local_video_path: string | null
  local_video_filename: string | null
  thumbnail_path: string | null
}

TranscriptCue {
  startTime: number                     -- Milliseconds
  endTime: number
  text: string
}

VocabEntry {
  word: string
  cefr_level: string                    -- A1, A2, B1, ...
  status: number                        -- 0, 1, 2
}
```

---

## API Endpoints Summary

| Verb | Path | Purpose | Returns |
|------|------|---------|---------|
| `GET` | `/api/videos` | List all videos | `Video[]` |
| `POST` | `/api/videos/import` | Import video + transcript | `Video` |
| `GET` | `/api/videos/:id` | Fetch single video | `Video` |
| `PATCH` | `/api/videos/:id` | Update metadata | `Video` |
| `DELETE` | `/api/videos/:id` | Delete video + cleanup | `{ ok: true }` |
| `GET` | `/api/videos/:id/transcript` | Parse transcript | `TranscriptCue[]` |
| `GET` | `/api/videos/:id/stream` | Stream video (local) | Binary stream |
| `GET` | `/api/videos/:id/thumbnail` | Get/generate thumbnail | JPEG image |
| `GET` | `/api/vocabulary` | List all words | `VocabEntry[]` |
| `PATCH` | `/api/vocabulary/:word` | Update word status | `VocabEntry` |

See `docs/api-reference.md` for request/response shapes.

---

## File Structure (Key Files Only)

```
src/
  app/
    (app)/
      layout.tsx                    # Sidebar + TopBar wrapper
      dashboard/page.tsx            # Video grid (server)
      player/[id]/page.tsx          # Player page (server)
      vocabulary/page.tsx           # Vocab browser (server)
    api/
      videos/
        route.ts                    # GET: list, POST: starts import flow
        import/route.ts             # POST: handle import
        [id]/route.ts               # GET, PATCH, DELETE single video
        [id]/transcript/route.ts    # GET: parsed transcript cues
        [id]/stream/route.ts        # GET: stream video file
        [id]/thumbnail/route.ts     # GET/POST: thumbnail
      vocabulary/
        route.ts                    # GET: list vocab
        [word]/route.ts             # PATCH: update word status
  components/
    *.tsx                           # React components (all client)
  hooks/
    *.ts                            # React Query hooks
  lib/
    server/composition.ts           # DI root (SINGLETON)
    video-{service,store}.ts        # Business logic + persistence
    vocab-store.ts                  # Vocabulary persistence
    videos.ts                       # Zod schemas
    db.ts                           # SQLite setup
    parse-transcript.ts             # Parsing logic
    transcripts.ts                  # File I/O
    data-dir.ts                     # Directory management
tests/
  e2e/
    *.spec.ts                       # Playwright tests
    pages/                          # Page Object Model
```

---

## Important Constraints & Warnings

### ✅ MUST DO

- **Use pnpm** — native addon `better-sqlite3` requires it
- **Add `export const runtime = 'nodejs'`** to all API routes
- **Await `params` in dynamic routes** — Next.js 16 types as Promise
- **Mock composition with factory** — SWC makes exports non-configurable
- **Use `@/` path alias** — configured in tsconfig.json
- **Call `getContainer()` inside route handlers** — never at module scope

### ❌ DON'T DO

- **Don't use Edge runtime** — `better-sqlite3` is native
- **Don't instantiate services directly** — use composition root
- **Don't use `result.error.errors`** — Zod v4 uses `.issues`
- **Don't forget to deserialize tags** — stored as JSON string in DB
- **Don't mix tags API format** — import expects comma-sep, PATCH expects JSON array string
- **Don't remove `allowBuilds` from pnpm-workspace.yaml** — native addon won't build
- **Don't run lint as a CI gate** — pre-existing test failures

---

## Development Workflow

### 1. **Make Changes**
```bash
# Edit src/**/*.tsx or src/**/*.ts
```

### 2. **Validate**
```bash
# Type check + build
pnpm build

# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Lint (informational only)
pnpm lint
```

### 3. **Before Committing**
- `pnpm build` must pass
- `pnpm test` must pass
- E2E tests should pass (optional for PRs, runs on push to main)

### 4. **CI Pipeline**
- Triggered on **push to main only** (post-merge)
- Runs: `pnpm test` → `pnpm test:e2e`
- No lint step in CI

---

## Common Implementation Tasks

| Task | Entry Point | Key Files |
|------|-------------|-----------|
| Add new API endpoint | `src/app/api/` | Create `route.ts`, use `getContainer()`, add to test |
| Add new page route | `src/app/(app)/` | Create `page.tsx` as server component, use hooks |
| Add new React component | `src/components/` | Create `.tsx` file, export component |
| Add new React hook | `src/hooks/` | Create `.ts` file, export hook |
| Modify database schema | `src/lib/db.ts` | Update `initializeSchema()`, migrations |
| Add validation | `src/lib/api-schemas.ts` or `src/lib/videos.ts` | Add Zod schema |
| Add post-import task | `src/lib/tasks/` | Implement `PostImportTask` interface, register in composition |
| Write unit test | `src/**/__tests__/` | Create `.test.ts(x)`, follow existing patterns |
| Write E2E test | `tests/e2e/` | Create `.spec.ts`, use POM classes |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Module not found: better-sqlite3` | Run `pnpm install` (native addon not built) |
| `Cannot find module '@/...'` | Check path alias in tsconfig.json, use `@/` prefix |
| `GET /api/... → 404` | Verify `export const runtime = 'nodejs'` in route |
| `TypeError: params is not awaited` | Add `const { id } = await params` in dynamic route |
| `.error.errors is undefined` | Use `result.error.issues` (Zod v4) |
| `Tags validation fails` | Check format: import = comma-sep, PATCH = JSON array string |
| `Cannot redefine property` in tests | Use factory mock for composition (not spyOn) |
| `Thumbnail extraction fails` | ffmpeg installed? (`@ffmpeg-installer/ffmpeg`) |
| Tests timeout | Increase `initial_wait` in bash async mode; check DB lock |

---

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Import local video + transcript | ✅ Complete | Supports .srt, .vtt, .txt |
| Video grid + metadata | ✅ Complete | Tags, thumbnails, sync |
| Player + transcript sync | ✅ Complete | Seeks to cue on click |
| Vocabulary browser | ✅ Complete | DB-wired with CEFR level tracking (A1–C2) |
| Edit video metadata | ✅ Complete | Tags, transcripts |
| Delete video | ✅ Complete | Cleanup: DB, files, thumbnails |
| Generate thumbnails | ✅ Complete | Via ffmpeg post-import task |
| Stream local video | ✅ Complete | Range request support |
| Word status tracking | ✅ Complete | CEFR levels A1–C2 |

---

## Performance Considerations

- **SQLite WAL mode** — enabled for concurrent read/write
- **React Query caching** — avoids refetch on navigation
- **Thumbnail extraction** — runs async post-import (doesn't block UI)
- **Transcript parsing** — lazy-loaded on demand (not cached)
- **Local data only** — no network latency, full offline-first

---

## Security Notes

- **Content Security Policy** — headers.tsx restricts inline scripts
- **No authentication** — single-user app, not for shared systems
- **Local filesystem access** — sandboxed to `.lingoflow-data/`
- **No external APIs** — except YouTube oEmbed (optional, E2E stubbed)
- **Zod validation** — all API inputs validated before processing

---

**Next Steps:** See `docs/project-architecture.md` for detailed module breakdown, API contracts, and testing patterns.
