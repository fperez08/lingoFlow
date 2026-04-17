# Issue #142 — Remove YouTube Path & Refresh Tests: Context Document

## Overview

Issue #142 completes the YouTube-to-local migration by removing all remaining
YouTube-specific runtime code, E2E stubs, and test fixtures; handling
pre-migration records with a clean-slate migration; and replacing all automated
tests with local-video equivalents.

**Prior work landed:**
- #138 / PR #143 — `source_type` field, `LocalVideoPlayer`, `/api/videos/[id]/stream`
- #139 / PR #144 — local upload import flow, `ImportVideoModal` updated
- #140 / PR #145 — auto thumbnail generation, ffmpeg deps
- #141 / PR #146 — upload validation, 500 MB limit, MIME enforcement

---

## 1. Complete Inventory of YouTube-Specific Code

### 1a. Files to **delete entirely**

| File | Why |
|---|---|
| `src/lib/youtube.ts` | All YouTube runtime: `fetchYoutubeMetadata`, `extractYoutubeId`, `STUB_VIDEOS`, `YoutubeMetadataError` |
| `src/lib/__tests__/youtube.test.ts` | All tests for the above — 30+ test cases, all YouTube-only |
| `src/types/youtube.d.ts` | TypeScript ambient declarations for the YouTube IFrame API (`YT` global) |
| `src/components/MiniPlayer.tsx` | YouTube IFrame API wrapper — entirely YouTube-specific, replaced by `LocalVideoPlayer` |
| `src/components/__tests__/MiniPlayer.test.tsx` | Tests for MiniPlayer |

### 1b. Files to **heavily modify** (YouTube path removed, local path stays)

#### `src/app/api/videos/import/route.ts`
- Lines 2–3: import of `fetchYoutubeMetadata` from `@/lib/youtube` — **remove**
- Lines 53–90: entire YouTube import branch (`ImportVideoRequestSchema` parse, `fetchYoutubeMetadata` call, `videoService.importVideo(...)`) — **remove**
- The `isLocal` early-return branch for local uploads stays unchanged.

#### `src/lib/video-service.ts`
- `ImportVideoParams` interface (lines 14–24) — **remove** (`youtube_url`, `youtube_id`, `thumbnail_url`, etc.)
- `importVideo(params: ImportVideoParams)` method (lines 52–74) — **remove**
- `importLocalVideo` and all other methods unchanged.

#### `src/lib/api-schemas.ts`
- `ImportVideoRequestSchema` (the YouTube URL + transcript schema) — **remove**
- `ImportVideoRequestSchema` export type reference — **remove**
- `ImportLocalVideoRequestSchema` stays; becomes the sole import schema.

#### `src/components/ImportVideoModal.tsx`
- Mode toggle buttons (`import-mode-youtube` / `import-mode-local`) — **remove YouTube tab**, keep Local only, or collapse to a single-mode form.
- YouTube URL field block (`importMode === 'youtube'` branch, preview container) — **remove**
- `data-testid="import-mode-youtube"`, `data-testid="youtube-url-input"`, `data-testid="preview-container"` — **remove from DOM**
- Local file fields (`import-mode-local` branch) become the default and only UI.

#### `src/hooks/useImportVideoForm.ts`
- Import of `fetchYoutubeMetadata`, `YoutubeMetadataError` from `@/lib/youtube` — **remove**
- `youtubeUrl`, `setYoutubeUrl`, `preview`, `previewError`, `isLoadingPreview` state — **remove**
- `fetchPreview` callback and debounced `useEffect` — **remove**
- `ImportMode` type + `importMode` / `setImportMode` — **remove or simplify to local-only**
- YouTube branch in `handleSubmit` — **remove**
- YouTube branch in `canSubmit` — **remove**
- `UseImportVideoFormResult` interface — strip YouTube fields

#### `src/components/PlayerClient.tsx`
- `source_type === 'local'` conditional ternary (lines 242–265) — collapse to **always** render `LocalVideoPlayer`; remove `MiniPlayer` import and usage.

#### `src/lib/videos.ts`
- `youtube_url`, `youtube_id`, `thumbnail_url` fields in `VideoSchema` and `InsertVideoParamsSchema` — these are still needed for DB compatibility (existing schema has the columns). **Option A:** keep the fields as `z.string().default('')` for backward compat. **Option B:** mark as deprecated optional. Lean on Option A (minimal schema change, no migration required for local inserts that already pass `''`).

#### `src/lib/video-store.ts`
- `insert()` SQL still includes `youtube_url`, `youtube_id` columns. Keep the SQL but accept empty strings (already done for local imports).
- `rowToVideo` default for `source_type` is `'youtube'` — change default to `'local'`.

#### `src/lib/db.ts`
- `initializeSchema` creates columns `youtube_url TEXT NOT NULL`, etc. These stay in the schema because existing DBs have them; no removal needed.

#### `next.config.ts`
- `Content-Security-Policy`: `script-src` includes `https://www.youtube.com`, `https://www.youtube-nocookie.com`, `https://s.ytimg.com`; `img-src` includes `https://i.ytimg.com`, `https://img.youtube.com`; `connect-src` and `frame-src` include YouTube domains. **Remove all YouTube CSP entries** once YouTube runtime code is gone.

#### `playwright.config.ts`
- `webServer.command`: `E2E_STUB_YOUTUBE=true pnpm dev` — **remove** `E2E_STUB_YOUTUBE=true`
- `webServer.env.E2E_STUB_YOUTUBE: 'true'` — **remove** the env var entry entirely

---

## 2. E2E Test Fixtures That Need Updating

### 2a. `tests/e2e/fixtures/index.ts`
**Remove:**
- `YoutubeStubContext` interface
- `setupYoutubeStub()` function
- `teardownYoutubeStub()` function
- `SeedVideoParams.youtube_url`, `youtube_id`, `thumbnail_url` fields
- `seedVideo()` defaults that build YouTube URLs

**Replace `seedVideo()` with local-video defaults:**
```ts
export interface SeedVideoParams {
  id?: string
  title?: string
  author_name?: string
  transcript_path?: string
  transcript_format?: string
  local_video_path?: string
  local_video_filename?: string
  tags?: string[]
}

export function seedVideo(params: SeedVideoParams = {}) {
  const id = params.id ?? crypto.randomUUID()
  const { insertVideo } = require('../../../src/lib/videos')
  return insertVideo({
    id,
    youtube_url: '',
    youtube_id: '',
    title: params.title ?? `Test Video ${id}`,
    author_name: params.author_name ?? 'Test Author',
    thumbnail_url: '',
    transcript_path: params.transcript_path ?? `transcripts/${id}.txt`,
    transcript_format: params.transcript_format ?? 'txt',
    tags: params.tags ?? [],
    source_type: 'local',
    local_video_path: params.local_video_path ?? null,
    local_video_filename: params.local_video_filename ?? null,
  })
}
```

### 2b. `tests/e2e/fixtures/__tests__/fixtures.test.ts`
- Remove `describe('setupYoutubeStub / teardownYoutubeStub', ...)` block (6 tests)
- Update `seedVideo()` test assertions: remove `youtube_id` / `thumbnail_url` checks
- Add `source_type: 'local'` assertion to `seedVideo` tests

### 2c. `tests/e2e/pages/ImportActions.ts`
- `fillYoutubeUrl()` — **remove** (no longer needed)
- Keep `fillTranscriptFile()`, `fillTags()`, `fillVideoFile()` (new), `clickSubmitImport()`, `assertValidationError()`
- Add `fillVideoFile(file: TranscriptInput)` targeting `data-testid="video-file-input"`

### 2d. `tests/e2e/pages/__tests__/ImportActions.test.ts`
- Remove `fillYoutubeUrl` unit test
- Add `fillVideoFile` unit test

### 2e. Mock video objects in all spec files

Every MOCK_VIDEO constant across specs contains YouTube fields. They must be updated to local-video shape:

**New canonical mock shape:**
```ts
const MOCK_VIDEO = {
  id: 'mock-vid-1',
  youtube_url: '',
  youtube_id: '',
  title: 'French Lesson 1',
  author_name: 'Language Channel',
  thumbnail_url: '',           // or a local blob URL / generated thumbnail path
  source_type: 'local',
  local_video_path: '.lingoflow-data/videos/mock-vid-1.mp4',
  local_video_filename: 'french-lesson.mp4',
  transcript_path: '.lingoflow-data/transcripts/mock-vid-1.srt',
  transcript_format: 'srt',
  tags: ['french', 'beginner'],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}
```

Files to update: `player.spec.ts`, `import-happy-path.spec.ts`, `import-player-flow.spec.ts`, `dashboard-states.spec.ts`, `edit-tags.spec.ts`, `delete-video.spec.ts`, `cross-screen.spec.ts`

---

## 3. E2E Test Scenarios to Rewrite

### `import-happy-path.spec.ts` → Local upload happy path
**Currently:** fills YouTube URL + transcript → submits → asserts video card.
**After:** selects local file + title + transcript → submits → asserts card.

New test steps:
1. Open import modal
2. *(No mode toggle needed once YouTube tab removed)*
3. Set video file (`data-testid="video-file-input"`)
4. Set title (`data-testid="local-title-input"`)
5. Optionally set author (`data-testid="local-author-input"`)
6. Upload transcript (`data-testid="transcript-input"`)
7. Add tags
8. Submit
9. Assert video card visible with correct title and tags
10. Reload, assert persistence

Use a small real `.mp4` fixture (even 1-byte stub is OK; the route validates MIME) or mock the `/api/videos/import` route as the current test already does.

### `import-player-flow.spec.ts` → Local import → player integration
**Currently:** real YouTube URL, real E2E stub server, real DB. Relies on `E2E_STUB_YOUTUBE`.
**After:** same real-DB integration flow, but using local file upload. Needs a small `.mp4` fixture added at `tests/e2e/fixtures/sample.mp4` (can be a tiny valid MP4, ~10 KB).

New flow:
1. Upload local video + `fire-drill.srt` transcript
2. Navigate to player
3. Assert transcript cues visible
4. Play lesson (mini player shows `LocalVideoPlayer` instead of YouTube iframe)
5. Navigate back, delete video

### `import-validation.spec.ts` → Local upload validation
**Currently:** validates YouTube URL scenarios (invalid URL, non-YouTube, missing transcript).
**After:** validates local upload scenarios:
1. Missing video file → submit disabled
2. Invalid MIME type (`.txt` file as video) → error "Unsupported format"
3. File > 500 MB → error "File exceeds 500 MB limit"
4. Missing title → submit disabled
5. Missing transcript → submit disabled
6. Valid file + valid title + bad transcript extension → server 400 "Invalid file extension"

### `player.spec.ts` → LocalVideoPlayer mock
**Currently:** mocks `MOCK_VIDEO` with YouTube fields, `MiniPlayer` renders YouTube iframe.
**After:** same page-route mocking, but `MOCK_VIDEO` uses `source_type: 'local'`, and the player renders `LocalVideoPlayer` (served via `/api/videos/[id]/stream`). The duration/seek assertions remain identical as long as `LocalVideoPlayer` emits the same `onTimeUpdate` contract.

### Other specs (`dashboard-states`, `edit-tags`, `delete-video`, `cross-screen`)
These only use MOCK_VIDEO for API route stubbing (no actual playback). Simply update mock shapes to local-video format. No behavior changes needed.

---

## 4. Migration Decision: Clean Slate

**Decision:** Delete all existing `source_type = 'youtube'` records at migration time.

**Rationale:**
- LingoFlow is a **local-first, single-user** app; no shared data, no user accounts.
- YouTube records reference a `youtube_id` and external thumbnail. The player code (`MiniPlayer`) that could render them will be removed. Showing a broken player is worse than showing nothing.
- The transcript files for YouTube records remain on disk but are orphaned — they can be left to be GC'd or deleted in the same migration.
- No user has "saved data" to preserve; this is a developer-own local instance.

**Migration SQL (add to `initializeSchema` in `src/lib/db.ts`):**
```sql
DELETE FROM videos WHERE source_type = 'youtube';
```
This runs at startup (idempotent: re-running on a clean DB is a no-op). Place it after `addColumnIfMissing` calls so the column is guaranteed to exist.

**Alternative (soft-hide):** Mark youtube records as `source_type = 'unavailable'` and display a "Video unavailable" placeholder card. Rejected: adds dead UI code; not worth it for a local dev tool.

---

## 5. What Tests Should Look Like After Issue #142

### Unit tests

| File | State after |
|---|---|
| `src/lib/__tests__/youtube.test.ts` | **Deleted** |
| `src/lib/__tests__/video-service.test.ts` | Remove `importVideo` tests; keep `importLocalVideo`, `updateVideo`, `deleteVideo` |
| `src/app/api/videos/import/__tests__/route.test.ts` | Remove all YouTube-path tests; keep/expand local upload tests |
| `src/hooks/__tests__/useImportVideoForm.test.ts` | Remove YouTube preview/URL tests; keep local mode tests |
| `src/components/__tests__/MiniPlayer.test.tsx` | **Deleted** |
| `src/components/__tests__/ImportVideoModal.test.tsx` | Remove YouTube tab tests; keep local mode tests |
| `tests/e2e/fixtures/__tests__/fixtures.test.ts` | Remove YouTube stub tests; update seedVideo assertions |

### E2E tests (Playwright)

All 7 spec files updated: mock shapes use local-video format. Import specs test local file upload flow. Player spec tests `LocalVideoPlayer`. Validation spec tests local-upload validation rules. No `E2E_STUB_YOUTUBE` references anywhere.
