# YouTube Removal Plan — Issue #142

Complete guide for removing YouTube-specific code, stubs, and fixtures, and
replacing them with local-video equivalents.

---

## Files to Delete

| File | Reason |
|---|---|
| `src/lib/youtube.ts` | Entire file: `fetchYoutubeMetadata`, `extractYoutubeId`, `STUB_VIDEOS`, `YoutubeMetadataError` |
| `src/lib/__tests__/youtube.test.ts` | All tests for the above (30+ test cases) |
| `src/types/youtube.d.ts` | Ambient `YT` IFrame API type declarations |
| `src/components/MiniPlayer.tsx` | YouTube IFrame API wrapper (replaced by `LocalVideoPlayer`) |
| `src/components/__tests__/MiniPlayer.test.tsx` | Tests for `MiniPlayer` |

---

## Files to Modify

### `src/app/api/videos/import/route.ts`
**Remove:**
- `import { fetchYoutubeMetadata } from '@/lib/youtube'`
- `import { ImportVideoRequestSchema, ... }` — remove `ImportVideoRequestSchema`
- Entire YouTube branch (lines 53–90): schema parse, `fetchYoutubeMetadata` call, `videoService.importVideo(...)`, response
- The `isLocal` check can be simplified to unconditional since it's the only path.

**Result:** route only handles the local upload case.

### `src/lib/video-service.ts`
**Remove:**
- `ImportVideoParams` interface
- `importVideo(params: ImportVideoParams): Promise<Video>` method

**Keep:** `ImportLocalVideoParams`, `importLocalVideo`, `UpdateVideoServiceParams`, `updateVideo`, `deleteVideo`.

### `src/lib/api-schemas.ts`
**Remove:**
- `ImportVideoRequestSchema` (YouTube URL + transcript validation)
- Any exported types derived solely from it

**Keep:** `ImportLocalVideoRequestSchema`, `UpdateVideoRequestSchema`, all allowed-format constants.

### `src/hooks/useImportVideoForm.ts`
**Remove:**
- `import { fetchYoutubeMetadata as defaultFetchMetadata, YoutubeMetadataError } from '@/lib/youtube'`
- `YoutubePreview` interface
- `youtubeUrl`, `setYoutubeUrl`, `preview`, `previewError`, `isLoadingPreview` state
- `fetchPreview` callback + debounced `useEffect`
- `importMode`, `setImportMode`, `ImportMode` type (or simplify to constant `'local'`)
- YouTube branch in `handleSubmit` (URL check, preview check)
- YouTube branch in `canSubmit`
- `fetchMetadata` injectable option (only used by YouTube path + tests)
- `UseImportVideoFormResult` interface: strip `importMode`, `setImportMode`, `youtubeUrl`, `setYoutubeUrl`, `preview`, `previewError`, `isLoadingPreview`

### `src/components/ImportVideoModal.tsx`
**Remove:**
- Mode toggle bar (YouTube / Local File buttons, `data-testid="import-mode-youtube"`)
- YouTube URL input block (`importMode === 'youtube'` branch)
- Preview container (`data-testid="preview-container"`)
- `data-testid="url-preview-error"` element
- All `youtubeUrl`, `setYoutubeUrl`, `preview`, `previewError`, `isLoadingPreview` hook bindings
- `importMode === 'youtube'` conditional rendering

**Keep / simplify:** Local file inputs become the only form fields; render them unconditionally.

### `src/components/PlayerClient.tsx`
**Remove:**
- `import MiniPlayer from '@/components/MiniPlayer'`
- The `source_type === 'local'` ternary around the player — collapse to always render `LocalVideoPlayer`
- `youtubeId={video.youtube_id}` prop reference

**Result:** `{isMiniPlayerOpen && <LocalVideoPlayer ... />}` unconditionally.

### `src/lib/videos.ts`
`youtube_url`, `youtube_id`, `thumbnail_url` remain in schemas as `z.string()` (defaulting to `''`) for DB backward compatibility — the SQLite columns still exist. No schema change needed. 

`source_type` default in `InsertVideoParamsSchema` should change from `'youtube'` to `'local'`:
```ts
source_type: z.enum(['youtube', 'local']).optional().default('local'),
```

### `src/lib/video-store.ts`
`rowToVideo` default for `source_type`:
```ts
source_type: ((row.source_type ?? 'local') as 'youtube' | 'local'),
```
(Previously defaulted to `'youtube'`; after migration any pre-existing rows should be gone, but defensive default is `'local'`.)

### `src/lib/db.ts`
Add clean-slate migration after `addColumnIfMissing` calls:
```ts
// Clean-slate migration: remove pre-local-video YouTube records
db.exec("DELETE FROM videos WHERE source_type = 'youtube'")
```
This is safe to run on every startup — no-op once records are gone.

Keep all existing columns (`youtube_url`, `youtube_id`, `thumbnail_url`) — removing SQLite columns requires a table rebuild and is not necessary.

### `next.config.ts`
Remove all YouTube domains from CSP headers:

**script-src** — remove: `https://www.youtube.com https://www.youtube-nocookie.com https://s.ytimg.com`

**img-src** — remove: `https://i.ytimg.com https://img.youtube.com`

**connect-src** — remove: `https://www.youtube.com https://www.youtube-nocookie.com`

**frame-src** — remove: `https://www.youtube.com https://www.youtube-nocookie.com` (or remove `frame-src` entirely since no iframes remain)

### `playwright.config.ts`
```ts
// Before:
command: 'E2E_STUB_YOUTUBE=true pnpm dev',
env: { E2E_STUB_YOUTUBE: 'true', LINGOFLOW_DATA_DIR: e2eDataDir },

// After:
command: 'pnpm dev',
env: { LINGOFLOW_DATA_DIR: e2eDataDir },
```

---

## Files to Update — Test Fixtures

### Replace YouTube fixtures with local-video fixtures

#### `tests/e2e/fixtures/index.ts`
1. Remove `YoutubeStubContext`, `setupYoutubeStub()`, `teardownYoutubeStub()`
2. Simplify `SeedVideoParams` — remove `youtube_url`, `youtube_id`, `thumbnail_url`; add `local_video_path?`, `local_video_filename?`
3. `seedVideo()` defaults: empty strings for `youtube_url`/`youtube_id`/`thumbnail_url`, `source_type: 'local'`

#### `tests/e2e/fixtures/__tests__/fixtures.test.ts`
1. Remove `describe('setupYoutubeStub / teardownYoutubeStub', ...)` block entirely
2. Update `seedVideo` test: assert `source_type === 'local'`; remove `youtube_id` field assertion

#### Add `tests/e2e/fixtures/sample.mp4`
A minimal valid MP4 file (~10 KB) for use in local-upload E2E tests. Can be generated with ffmpeg:
```bash
ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=1 \
       -f lavfi -i sine=frequency=440:duration=1 \
       -c:v libx264 -c:a aac tests/e2e/fixtures/sample.mp4
```
Or use a committed binary stub (tiny valid MP4 header, ignored by lint/build).

Remove `tests/e2e/fixtures/fire-drill.srt` if the fire-drill integration test is rewritten to use `sample.srt`.

---

## Files to Update — E2E Specs

### MOCK_VIDEO shape update (all spec files)

Replace YouTube-shaped mock objects:
```ts
// BEFORE
const MOCK_VIDEO = {
  id: 'test-vid-1',
  youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  youtube_id: 'dQw4w9WgXcQ',
  title: 'Rick Astley - Never Gonna Give You Up',
  author_name: 'RickAstleyVEVO',
  thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg',
  transcript_path: '/tmp/test/transcripts/test-vid-1.srt',
  transcript_format: 'srt',
  tags: ['music', 'classic'],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

// AFTER
const MOCK_VIDEO = {
  id: 'test-vid-1',
  youtube_url: '',
  youtube_id: '',
  title: 'French Lesson 1',
  author_name: 'Language Channel',
  thumbnail_url: '',
  source_type: 'local' as const,
  local_video_path: '.lingoflow-data/videos/test-vid-1.mp4',
  local_video_filename: 'french-lesson.mp4',
  transcript_path: '.lingoflow-data/transcripts/test-vid-1.srt',
  transcript_format: 'srt',
  tags: ['french', 'beginner'],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}
```

Apply to: `player.spec.ts`, `dashboard-states.spec.ts`, `edit-tags.spec.ts`, `delete-video.spec.ts`, `cross-screen.spec.ts`

### `import-happy-path.spec.ts` — rewrite

**Goal:** import a local video file with title, transcript, and tags; assert card; assert persistence.

Key steps replacing the YouTube URL flow:
```ts
// No mode toggle needed (YouTube tab removed)
await page.getByTestId('video-file-input').setInputFiles(SAMPLE_MP4)
await page.getByTestId('local-title-input').fill('French Lesson 1')
await importActions.fillTranscriptFile(SAMPLE_SRT)
await importActions.fillTags('french, beginner')
await importActions.clickSubmitImport()
```

Mock `POST /api/videos/import` as before (no real server call needed for happy path).

### `import-player-flow.spec.ts` — rewrite

Replace YouTube URL flow with local upload. Real DB integration test:
1. Upload `sample.mp4` + `sample.srt` transcript via the UI
2. Assert video card appears
3. Navigate to player — assert transcript cues
4. Click play — assert `LocalVideoPlayer` is visible (not YouTube iframe)
5. Navigate back — delete video — assert empty state

Replace `FIRE_DRILL_URL` constant with `SAMPLE_MP4` and `SAMPLE_SRT` fixture paths.
Remove check for `preview-container` (no preview for local uploads).

### `import-validation.spec.ts` — rewrite

Replace YouTube validation scenarios with local-upload scenarios:

| # | Scenario | Expected |
|---|---|---|
| 1 | No video file selected | Submit disabled |
| 2 | Video file, no title | Submit disabled |
| 3 | Video + title, no transcript | Submit disabled |
| 4 | Video file with `.txt` MIME | Error "Unsupported format" |
| 5 | Video file > 500 MB | Error "File exceeds 500 MB limit" |
| 6 | Valid video + title + `.doc` transcript → server 400 | Error "Invalid file extension" |

Remove all `fillYoutubeUrl`, `url-preview-error`, `preview-container` references.

### `player.spec.ts` — update mock shape + player assertion

Update `MOCK_VIDEO` to local shape. The existing assertions about playback controls, transcript sync, progress bar, seek, and mini-player open/close remain valid. Replace any iframe-specific assertions (if any) with `LocalVideoPlayer` assertions (e.g., `data-testid="local-video-player"` or the `<video>` element).

### `pages/ImportActions.ts` — update page object

Remove `fillYoutubeUrl()`. Add:
```ts
async fillVideoFile(file: TranscriptInput): Promise<void> {
  await this.page.getByTestId('video-file-input').setInputFiles(file)
}

async fillTitle(title: string): Promise<void> {
  await this.page.getByTestId('local-title-input').fill(title)
}
```

---

## DB Migration Strategy

### Approach: Clean Slate (DELETE on startup)

```ts
// src/lib/db.ts — inside initializeSchema(), after addColumnIfMissing calls:
db.exec("DELETE FROM videos WHERE source_type = 'youtube'")
```

**Properties:**
- **Idempotent:** safe to run on every app startup
- **No schema change:** avoids SQLite ALTER TABLE complexity
- **No data loss risk:** local-first, single-user app; no external users
- **No UI needed:** no "unavailable" placeholder state to build/test

### What happens to orphaned transcript files?
YouTube-backed transcript files remain at `.lingoflow-data/transcripts/<id>.<ext>` after the DB records are deleted. They are harmless (no references remain). Optionally, add a one-time cleanup in the same migration:

```ts
// After DELETE, collect transcript paths before deleting rows — or
// alternatively accept the orphans since disk space is not a concern here.
```

For simplicity, leave orphaned transcripts; they will not be served or referenced.

---

## Unit Test Updates

### `src/lib/__tests__/video-service.test.ts`
- Remove `describe('importVideo', ...)` block
- Keep `describe('importLocalVideo', ...)`, `describe('updateVideo', ...)`, `describe('deleteVideo', ...)`
- Update base mock `FAKE_VIDEO` to use `source_type: 'local'`, empty YouTube fields

### `src/app/api/videos/import/__tests__/route.test.ts`
- Remove `jest.mock('@/lib/youtube')` and all `mockFetchYoutubeMetadata` setup
- Remove all test cases that send `youtube_url` in FormData
- Keep/expand: local upload tests (valid, missing video, missing title, missing transcript, wrong MIME, oversized)

### `src/hooks/__tests__/useImportVideoForm.test.ts`
- Remove `import { YoutubeMetadataError } from '@/lib/youtube'`
- Remove all tests in `describe('debounced preview fetch', ...)` block
- Remove all tests referencing `youtubeUrl`, `preview`, `previewError`, `isLoadingPreview`
- Remove `fetchMetadata` mock from `renderForm`
- Keep/expand: local mode form tests (video file, title, author, transcript modes, submit)

### `src/components/__tests__/ImportVideoModal.test.tsx`
- Remove tests for YouTube tab rendering, URL input, preview container
- Keep/expand: local mode form rendering and submission tests

---

## Checklist for Implementer

- [ ] Delete: `src/lib/youtube.ts`, `src/lib/__tests__/youtube.test.ts`, `src/types/youtube.d.ts`
- [ ] Delete: `src/components/MiniPlayer.tsx`, `src/components/__tests__/MiniPlayer.test.tsx`
- [ ] Modify: `src/app/api/videos/import/route.ts` — remove YouTube branch
- [ ] Modify: `src/lib/video-service.ts` — remove `ImportVideoParams` + `importVideo`
- [ ] Modify: `src/lib/api-schemas.ts` — remove `ImportVideoRequestSchema`
- [ ] Modify: `src/hooks/useImportVideoForm.ts` — strip YouTube state/logic
- [ ] Modify: `src/components/ImportVideoModal.tsx` — remove YouTube tab + fields
- [ ] Modify: `src/components/PlayerClient.tsx` — always render `LocalVideoPlayer`
- [ ] Modify: `src/lib/videos.ts` — change `source_type` default to `'local'`
- [ ] Modify: `src/lib/video-store.ts` — change `rowToVideo` default to `'local'`
- [ ] Modify: `src/lib/db.ts` — add clean-slate `DELETE` migration
- [ ] Modify: `next.config.ts` — remove YouTube CSP entries
- [ ] Modify: `playwright.config.ts` — remove `E2E_STUB_YOUTUBE`
- [ ] Update: `tests/e2e/fixtures/index.ts` — remove YouTube stub helpers, update `seedVideo`
- [ ] Update: `tests/e2e/fixtures/__tests__/fixtures.test.ts` — remove YouTube stub tests
- [ ] Add: `tests/e2e/fixtures/sample.mp4` — minimal MP4 for E2E upload tests
- [ ] Update: `tests/e2e/pages/ImportActions.ts` — add `fillVideoFile`, `fillTitle`; remove `fillYoutubeUrl`
- [ ] Update: `tests/e2e/pages/__tests__/ImportActions.test.ts`
- [ ] Rewrite: `tests/e2e/import-happy-path.spec.ts` — local upload flow
- [ ] Rewrite: `tests/e2e/import-player-flow.spec.ts` — local upload → player integration
- [ ] Rewrite: `tests/e2e/import-validation.spec.ts` — local upload validation
- [ ] Update: `tests/e2e/player.spec.ts` — local MOCK_VIDEO shape
- [ ] Update: `tests/e2e/dashboard-states.spec.ts` — local MOCK_VIDEO shape
- [ ] Update: `tests/e2e/edit-tags.spec.ts` — local mock shape
- [ ] Update: `tests/e2e/delete-video.spec.ts` — local mock shape
- [ ] Update: `tests/e2e/cross-screen.spec.ts` — local mock shape
- [ ] Update unit tests: `video-service`, `import route`, `useImportVideoForm`, `ImportVideoModal`
- [ ] Run `pnpm build` — must pass (TypeScript validation)
- [ ] Run `pnpm test` — all Jest tests pass
- [ ] Run `pnpm test:e2e` — all Playwright specs pass
