# Copilot Instructions for LingoFlow

> Trust these instructions. Only search the codebase if information here is incomplete or appears incorrect.

## What This Repo Does

LingoFlow is a **local-first, single-user Next.js web app** (App Router, React 19, TypeScript 5). Users import YouTube videos with transcript files (`.srt`, `.vtt`, `.txt`), view transcripts in a synced player, edit tags/metadata, and browse vocabulary. There is no app-owned backend or authentication; video metadata is fetched from the YouTube oEmbed API at import time and then stored locally in SQLite. The vocabulary page uses mock data only (not yet DB-wired). Transcript files are stored on the local filesystem.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.3 (App Router) |
| UI | React 19, Tailwind CSS 3, TanStack React Query 5 |
| Language | TypeScript 5 (`strict: true`) |
| Database | SQLite via `better-sqlite3` 12 (native module) |
| Validation | Zod 4 |
| Unit tests | Jest 30 + Testing Library |
| E2E tests | Playwright 1.59 |
| Package manager | **pnpm** (only supported; do not use npm or yarn) |
| Node runtime | Node 24 |

## Build & Validation

**Always run `pnpm install` before any other command**, especially after changing `package.json`.

```bash
pnpm install          # install / sync dependencies
pnpm build            # production build — must pass; validates TypeScript
pnpm test             # Jest unit tests — must pass
pnpm dev              # dev server on http://localhost:3000
pnpm lint             # ESLint — DO NOT treat exit code as a gate (see below)
pnpm test:e2e         # Playwright E2E — auto-starts dev server via webServer config
```

**`pnpm build` validates TypeScript.** It must succeed. Run it after any type-level changes.

**`pnpm lint` has pre-existing failures** in test files (`no-explicit-any`, `no-require-imports`). The CI pipeline does **not** run lint. Do not introduce new lint errors in `src/` (production code), but do not attempt to fix the pre-existing test-file errors unless that is the task.

**E2E tests** stub the YouTube API. The env var `E2E_STUB_YOUTUBE=true` is set automatically by Playwright's `webServer` config. Running `pnpm test:e2e` locally reuses an existing dev server if one is already running on port 3000.

## CI Pipeline

Defined in `.github/workflows/e2e.yml`. Triggers on **push to `main` only** (post-merge, not on PRs). Steps:
1. `pnpm install --frozen-lockfile`
2. `pnpm test` (Jest)
3. `pnpm test:e2e` (Playwright, Chromium only)

There is no lint step in CI. Because CI is post-merge only, **always run `pnpm build` and `pnpm test` locally before finishing** to catch failures before they land on `main`.

## Project Layout

```
src/
  app/
    layout.tsx                     # Root layout — Providers (React Query), fonts
    page.tsx                       # Redirects to /dashboard
    (app)/                         # Route group — Sidebar + TopBar layout
      dashboard/page.tsx           # Video grid, import/edit/delete modals
      player/[id]/page.tsx         # Server component — fetches video, renders PlayerClient
      vocabulary/page.tsx          # Vocabulary browser (mock data only, not yet DB-wired)
    api/
      videos/route.ts              # GET /api/videos — list all videos
      videos/import/route.ts       # POST /api/videos/import — import from YouTube
      videos/[id]/route.ts         # GET / PATCH / DELETE /api/videos/:id
      videos/[id]/transcript/route.ts  # GET /api/videos/:id/transcript — parsed cues
  components/                      # React UI components (modals, VideoCard, Sidebar, etc.)
  hooks/
    useVideos.ts                   # React Query hook — GET /api/videos
    useVideoMutations.ts           # Mutation hooks — delete, refresh
    useImportVideoForm.ts          # Form state for import modal
  lib/
    db.ts                          # SQLite helpers: openDb, initializeSchema, ensureDataDirs
    videos.ts                      # Zod schemas + TypeScript types: Video, InsertVideoParams, etc.
    video-store.ts                 # SqliteVideoStore — CRUD over the `videos` table
    video-service.ts               # VideoService — business logic (import, update, delete)
    api-schemas.ts                 # Zod schemas for API request bodies
    youtube.ts                     # fetchYoutubeMetadata, extractYoutubeId, E2E stub map
    transcripts.ts                 # writeTranscript / deleteTranscript (filesystem I/O)
    parse-transcript.ts            # parseSrt / parseVtt / parseTxt → TranscriptCue[]
    vocabulary.ts                  # MOCK_VOCAB data + types (CEFR levels A1–C2)
    server/
      composition.ts               # DI root — wires VideoService + SqliteVideoStore; exports
                                   # `videoStore` and `videoService` used by all route handlers
tests/
  e2e/
    *.spec.ts                      # Playwright specs
    pages/                         # Page Object Model classes
    fixtures/                      # Test fixture data (sample.srt, fixture factory)
```

**Key config files in repo root:** `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `tailwind.config.ts`, `jest.config.js`, `playwright.config.ts`, `pnpm-workspace.yaml`.

**Path alias:** `@/` resolves to `src/`. Use `@/lib/...`, `@/components/...`, etc. in all imports.

**Data directory:** `.lingoflow-data/` (gitignored). Contains `lingoflow.db` and `transcripts/`. Override with `LINGOFLOW_DATA_DIR` env var.

**Native module:** `better-sqlite3` is a native addon. `pnpm-workspace.yaml` sets `allowBuilds: { better-sqlite3: true }`. Do not remove this entry.

## Critical Patterns — Must Follow

### 1. API routes require Node.js runtime
Every file under `src/app/api/` **must** export:
```ts
export const runtime = 'nodejs'
```
`better-sqlite3` is a native module that cannot run in the Edge runtime. Omitting this line causes runtime errors.

### 2. API route tests require node Jest environment
Test files for API routes **must** start with:
```ts
// @jest-environment node
```
The default `jsdom` environment lacks the global `Request` object. See `src/app/api/videos/__tests__/route.test.ts` for the pattern.

### 3. Zod v4 error access
Use `result.error.issues[0].message` — **not** `result.error.errors`. Zod 4 renamed the property.

### 4. Composition root — do not instantiate services directly
Route handlers import from `@/lib/server/composition`:
```ts
import { videoStore, videoService } from '@/lib/server/composition'
```
Never construct `SqliteVideoStore` or `VideoService` directly in a route handler.

### 5. Tags API contract differs between routes
- `POST /api/videos/import`: `tags` in `FormData` is a **comma-separated string** (e.g. `"french,beginner"`)
- `PATCH /api/videos/[id]`: `tags` in `FormData` is a **JSON-serialized array string** (e.g. `'["french","beginner"]'`)

See `src/lib/api-schemas.ts` (`ImportVideoRequestSchema` vs `UpdateVideoRequestSchema`) for the exact shapes.

### 6. Dynamic route `params` must be awaited
In Next.js App Router (this repo uses Next 16), `params` is typed as `Promise<{ id: string }>` and must be awaited:
```ts
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // ...
}
```
See `src/app/api/videos/[id]/route.ts` for the canonical pattern.

### 7. Tags are JSON-serialized in SQLite
The `tags` column stores a JSON array string (e.g. `'["french","beginner"]'`). `SqliteVideoStore.rowToVideo()` deserializes it. Always pass `string[]` to store/service methods; never serialize manually in callers.

### 8. API route test mocking
Mock `@/lib/server/composition` in route handler tests. Follow existing test patterns under `src/app/api/` — some routes also mock `next/server` for `NextResponse`.