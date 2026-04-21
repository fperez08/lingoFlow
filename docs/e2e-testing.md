# LingoFlow — E2E Testing Reference

> Playwright 1.59, Chromium only. Tests live in `tests/e2e/`. Run with `pnpm test:e2e`.

---

## Configuration (`playwright.config.ts`)

```ts
// Key settings
testDir: './tests/e2e'
testMatch: ['**/*.spec.ts']
fullyParallel: true
retries: 2   // CI only
baseURL: 'http://localhost:3000'
trace: 'retain-on-failure'

// webServer auto-starts `pnpm dev` with isolated data dir
// reuseExistingServer: true locally (skips restart if port 3000 is up)
env: { LINGOFLOW_DATA_DIR: '<unique-tmp-dir-per-run>' }
```

Only `chromium` project is configured — no Firefox/WebKit.

---

## Test Structure

```ts
import { test, expect } from '@playwright/test'

test.describe('Feature name', () => {
  test.use({ viewport: { width: 1280, height: 900 } })  // optional override

  test('scenario description', async ({ page }) => {
    test.setTimeout(120_000)   // extend for slow tests
    // ... arrange, act, assert
  })
})
```

### Error monitoring pattern

```ts
const consoleErrors: string[] = []
const pageErrors: string[] = []
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
page.on('pageerror', error => { pageErrors.push(error.message) })
// ...
expect(consoleErrors).toEqual([])
expect(pageErrors).toEqual([])
```

---

## Page Object Model (POM)

All POM classes live in `tests/e2e/pages/`. Each takes a `Page` and wraps interactions behind descriptive async methods.

### `DashboardPage`

```ts
import { DashboardPage } from './pages/DashboardPage'
const dashboard = new DashboardPage(page)

await dashboard.loadDashboard()          // goto('/dashboard', { waitUntil: 'networkidle' })
await dashboard.assertEmpty()            // expects data-testid="empty-state" visible
await dashboard.assertLoading()          // expects data-testid="loading-indicator" visible
await dashboard.assertVideoCardCount(2)  // counts [data-testid^="video-card-"] in grid
const cards = await dashboard.getVideoCards()  // Locator[]
dashboard.videoCards()                   // Locator (all video cards in grid)
```

### `ImportActions`

```ts
import { ImportActions } from './pages/ImportActions'
const importActions = new ImportActions(page)

await importActions.clickImportButton()   // opens import-modal
await importActions.fillTitle('My Video')
await importActions.fillVideoFile('/abs/path/to/video.mp4')
// or with buffer:
await importActions.fillVideoFile({ name: 'video.mp4', mimeType: 'video/mp4', buffer: Buffer.from('...') })
await importActions.fillTranscriptFile('/abs/path/to/sample.srt')
await importActions.fillTags('french, beginner')   // comma-separated
await importActions.clickSubmitImport()
await importActions.assertValidationError('Title is required')  // message optional
```

### `EditActions`

```ts
import { EditActions } from './pages/EditActions'
const editActions = new EditActions(page)

await editActions.clickEditOnCard(0)     // zero-based index in grid
await editActions.addTag('newTag')       // fill + Enter
await editActions.removeTag('oldTag')   // clicks data-testid="remove-tag-{tagName}"
await editActions.clickSave()           // Save button → waits for modal to close
await editActions.assertTagsSaved(['newTag'])  // checks tags visible on page
```

### `DeleteActions`

```ts
import { DeleteActions } from './pages/DeleteActions'
const deleteActions = new DeleteActions(page)

await deleteActions.clickDeleteOnCard(0)        // zero-based index
await deleteActions.confirmDelete()             // confirm-delete-button → waits modal to close
await deleteActions.assertCardRemoved('video-id-123')  // expects card hidden
```

### `PlayerPage`

```ts
import { PlayerPage } from './pages/PlayerPage'
const player = new PlayerPage(page)

await player.navigateTo('video-id-123')   // goto + waits for player-client to attach (30s)
await player.assertLoaded()
await player.clickPlay()
await player.assertMiniPlayerOpen()       // mini-player + local-video visible
await player.closeMiniPlayer()
await player.assertMiniPlayerClosed()
await player.switchToTranscriptTab()

// Direct locators
player.playButton          // data-testid="play-button"
player.miniPlayer          // data-testid="mini-player"
player.miniPlayerClose     // data-testid="mini-player-close"
player.miniPlayerIframe    // data-testid="local-video" (<video> element)
player.playbackProgress    // data-testid="playback-progress"
player.progressBarFill     // data-testid="progress-bar-fill"
player.currentTime         // data-testid="current-time"
player.transcriptTab       // data-testid="tab-transcript"
```

### `VocabularyPage`

```ts
import { VocabularyPage } from './pages/VocabularyPage'
const vocabPage = new VocabularyPage(page)

await vocabPage.navigateTo()        // goto('/vocabulary', { waitUntil: 'networkidle' })
await vocabPage.assertLoaded()      // vocab-page-heading visible
await vocabPage.search('bonjour')   // fills vocab-search-input
await vocabPage.clickTab('mastered')  // 'new' | 'learning' | 'mastered'
const count = await vocabPage.getCardCount()

vocabPage.heading      // data-testid="vocab-page-heading"
vocabPage.vocabCards   // data-testid="vocab-card"
vocabPage.searchInput  // data-testid="vocab-search-input"
```

---

## API Route Interception

Use `page.route()` to stub API calls in tests that don't need a real server.

```ts
// Stub GET /api/videos
await page.route('**/api/videos', async route => {
  await route.fulfill({ json: videos })
})

// Stub POST and mutate local state
let videos: Video[] = []
await page.route('**/api/videos/import', async route => {
  videos = [importedVideo]
  await route.fulfill({ status: 201, json: importedVideo })
})

// Stub video stream (binary body)
await page.route(`**/api/videos/${id}/stream`, async route => {
  const mp4Buffer = fs.readFileSync(TEST_MP4)
  await route.fulfill({
    status: 200,
    headers: { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' },
    body: mp4Buffer,
  })
})

// Stub DELETE
await page.route(`**/api/videos/${id}`, async route => {
  if (route.request().method() === 'DELETE') {
    await route.fulfill({ status: 204 })
  } else {
    await route.continue()
  }
})
```

---

## Fixtures (`tests/e2e/fixtures/index.ts`)

Used when tests need a real DB (not route-stubbed).

```ts
import {
  setupIsolatedDb,
  teardownIsolatedDb,
  seedVideo,
  seedTranscript,
  type FixtureContext,
  type SeedVideoParams,
} from '../fixtures'

// In beforeAll/afterAll or beforeEach/afterEach:
let ctx: FixtureContext
beforeAll(() => { ctx = setupIsolatedDb(workerIndex) })
afterAll(() => { teardownIsolatedDb(ctx) })

// Seed a video with defaults (all fields optional):
const video = seedVideo({ id: 'abc', title: 'French Lesson', tags: ['french'] })

// Seed a transcript file:
const filePath = seedTranscript('abc', 'srt', '1\n00:00:01,000 --> 00:00:02,000\nBonjour\n')
```

`setupIsolatedDb` creates a temp dir, sets `LINGOFLOW_DATA_DIR`, and initializes the SQLite schema.  
`teardownIsolatedDb` closes the DB singleton, restores env, and removes the temp dir.

---

## Sample Fixtures

```
tests/e2e/fixtures/
  sample.srt     # real SRT file used in transcript upload tests
  test.mp4       # minimal MP4 used in player stream tests
```

Reference:
```ts
import path from 'path'
const SAMPLE_SRT = path.join(__dirname, 'fixtures', 'sample.srt')
const TEST_MP4   = path.join(__dirname, 'fixtures', 'test.mp4')
```

---

## `data-testid` Reference

### Dashboard / VideoCard

| `data-testid` | Element |
|---|---|
| `video-grid` | Video card grid container |
| `video-card-{id}` | Individual video card |
| `empty-state` | "No videos yet" placeholder |
| `loading-indicator` | Loading spinner |
| `edit-button` | Edit button on a card |
| `delete-button` | Delete button on a card |

### Import Modal

| `data-testid` | Element |
|---|---|
| `import-modal` | Modal container |
| `video-file-input` | `<input type="file">` for video |
| `local-title-input` | Title text input |
| `transcript-input` | `<input type="file">` for transcript |
| `tags-input` | Tags text input (comma-separated) |
| `submit-import-button` | Submit / import button |
| `import-error` | Validation error message |

### Edit Modal

| `data-testid` | Element |
|---|---|
| `edit-modal` | Modal container |
| `tag-input` | Tag entry input (press Enter to add) |
| `remove-tag-{tagName}` | Remove button for a specific tag |

### Delete Modal

| `data-testid` | Element |
|---|---|
| `delete-modal` | Modal container |
| `confirm-delete-button` | Confirm deletion button |

### Player

| `data-testid` | Element |
|---|---|
| `player-client` | Root player container |
| `play-button` | Play / launch mini-player button |
| `mini-player` | Floating video player wrapper |
| `mini-player-close` | Close mini-player button |
| `local-video` | `<video>` element |
| `playback-progress` | Progress bar container |
| `progress-bar-fill` | Filled progress bar |
| `current-time` | Current time label |
| `duration` | Duration label |
| `tab-transcript` | Transcript tab |
| `tab-vocabulary` | In-player vocabulary tab |
| `cue-{index}` | Transcript cue row (0-based) |
| `word-{normalized}` | Clickable word span in cue |
| `word-sidebar` | Word detail slide-over |
| `word-sidebar-close` | Close word sidebar button |
| `sidebar-word` | Word heading in sidebar |
| `sidebar-context` | Context sentence in sidebar |
| `status-toggle` | Status toggle button in sidebar |

### Vocabulary Page

| `data-testid` | Element |
|---|---|
| `vocab-page-heading` | Page heading |
| `vocab-card` | Individual word card |
| `vocab-search-input` | Search input |
| `tab-new` | "New" status tab |
| `tab-learning` | "Learning" status tab |
| `tab-mastered` | "Mastered" status tab |

---

## Common Assertions

```ts
// Visibility
await expect(locator).toBeVisible()
await expect(locator).toBeHidden()
await expect(locator).toBeAttached({ timeout: 30_000 })

// Content
await expect(locator).toContainText('Expected text')
await expect(locator).toHaveText('Exact text')
await expect(locator).toHaveCount(3)

// Classes
await expect(locator).toHaveClass(/border-primary/)
await expect(locator).not.toHaveClass(/border-primary/)

// Input value
await expect(input).toHaveValue('text')
```

---

## Running E2E Tests

```bash
pnpm test:e2e                          # all specs, reuses local server on :3000
pnpm test:e2e -- --headed              # show browser
pnpm test:e2e -- tests/e2e/player.spec.ts  # single spec
pnpm test:e2e -- --grep "import"       # filter by name
pnpm test:e2e:ui                       # interactive UI mode
```

E2E tests stub YouTube. `E2E_STUB_YOUTUBE=true` is auto-set by the `webServer` config.
