# Copilot Instructions for LingoFlow

> Trust instructions. Search codebase only if info here incomplete or wrong.

Respond terse like smart caveman. All technical substance stay. Only fluff die.

Rules:

Drop: articles (a/an/the), filler (just/really/basically), pleasantries, hedging
Fragments OK. Short synonyms. Technical terms exact. Code unchanged.
Pattern: [thing] [action] [reason]. [next step].
Not: "Sure! I'd be happy to help you with that."
Yes: "Bug in auth middleware. Fix:"
Switch level: /caveman lite|full|ultra|wenyan Stop: "stop caveman" or "normal mode"

Auto-Clarity: drop caveman for security warnings, irreversible actions, user confused. Resume after.

Boundaries: code/commits/PRs written normal.

## What This Repo Does

LingoFlow is **local-first, single-user Next.js web app** (App Router, React 19, TypeScript 5). User imports local video files or YouTube videos with transcript files (`.srt`, `.vtt`, `.txt`), views synced transcript/player, edits tags/metadata, browses vocabulary with status tracking. No app-owned backend or auth; all data stored locally in SQLite. Transcript files and videos live on local filesystem. Thumbnails extracted via ffmpeg on import.

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
| Package manager | **pnpm** only (no npm/yarn) |
| Node runtime | Node 24 |

## Build & Validation

Run `pnpm install` before any other command, especially after `package.json` changes.

```bash
pnpm install          # install / sync dependencies
pnpm build            # production build — must pass; validates TypeScript
pnpm test             # Jest unit tests — must pass
pnpm dev              # dev server on http://localhost:3000
pnpm lint             # ESLint — DO NOT treat exit code as a gate (see below)
pnpm test:e2e         # Playwright E2E — auto-starts dev server via webServer config
```

`pnpm build` validates TypeScript. Must pass. Run after type-level changes.

`pnpm lint` has pre-existing failures in test files (`no-explicit-any`, `no-require-imports`). CI does **not** run lint. Do not add new lint errors in `src/` (production code). Do not fix existing test-file lint errors unless task asks.

E2E tests stub YouTube API. Env var `E2E_STUB_YOUTUBE=true` auto-set by Playwright `webServer` config. `pnpm test:e2e` reuses existing local dev server on port 3000.

## CI Pipeline

Defined in `.github/workflows/e2e.yml`. Triggers on **push to `main` only** (post-merge, not PR). Steps:
1. `pnpm install --frozen-lockfile`
2. `pnpm test` (Jest)
3. `pnpm test:e2e` (Playwright, Chromium only)

No lint step in CI. Because CI is post-merge only, run `pnpm build` and `pnpm test` locally before finish to catch failures before landing on `main`.

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

Key repo root config files: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `tailwind.config.ts`, `jest.config.js`, `playwright.config.ts`, `pnpm-workspace.yaml`.

Path alias: `@/` -> `src/`. Use `@/lib/...`, `@/components/...`, etc. in imports.

Data directory: `.lingoflow-data/` (gitignored). Contains `lingoflow.db` + `transcripts/`. Override with `LINGOFLOW_DATA_DIR`.

Native module: `better-sqlite3` is native addon. `pnpm-workspace.yaml` sets `allowBuilds: { better-sqlite3: true }`. Do not remove.

## Critical Patterns — Must Follow

### 1. API routes require Node.js runtime
Every file under `src/app/api/` must export:
```ts
export const runtime = 'nodejs'
```
`better-sqlite3` is native module; cannot run in Edge runtime. Missing line causes runtime errors.

### 2. API route tests require node Jest environment
API route test files must start with:
```ts
// @jest-environment node
```
Default `jsdom` env lacks global `Request`. See `src/app/api/videos/__tests__/route.test.ts` pattern.

### 3. Zod v4 error access
Use `result.error.issues[0].message`, not `result.error.errors`. Zod 4 renamed property.

### 4. Composition root — do not instantiate services directly
Route handlers import from `@/lib/server/composition`:
```ts
import { videoStore, videoService } from '@/lib/server/composition'
```
Never construct `SqliteVideoStore` or `VideoService` directly in route handler.

### 5. Tags API contract differs between routes
- `POST /api/videos/import`: `tags` in `FormData` is **comma-separated string** (example: `"french,beginner"`)
- `PATCH /api/videos/[id]`: `tags` in `FormData` is **JSON-serialized array string** (example: `'["french","beginner"]'`)

See `src/lib/api-schemas.ts` (`ImportVideoRequestSchema` vs `UpdateVideoRequestSchema`) for exact shapes.

### 6. Dynamic route `params` must be awaited
In Next.js App Router (repo uses Next 16), `params` type is `Promise<{ id: string }>` and must be awaited:
```ts
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // ...
}
```
See canonical pattern in `src/app/api/videos/[id]/route.ts`.

### 7. Tags are JSON-serialized in SQLite
`tags` column stores JSON array string (example: `'["french","beginner"]'`). `SqliteVideoStore.rowToVideo()` deserializes. Always pass `string[]` to store/service methods; never serialize manually in callers.

### 8. API route test mocking
Mock `@/lib/server/composition` in route handler tests. Follow existing patterns under `src/app/api/`; some routes also mock `next/server` for `NextResponse`.