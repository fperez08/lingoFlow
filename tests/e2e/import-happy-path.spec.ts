/**
 * E2E spec: import happy path — URL + transcript + tags
 *
 * Tests the full video import flow: entering a YouTube URL, uploading a
 * transcript file, adding tags, submitting, verifying the video card appears,
 * and confirming persistence after page reload.
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import { DashboardPage } from './pages/DashboardPage'
import { ImportActions } from './pages/ImportActions'

const RICK_ASTLEY_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const RICK_ASTLEY_TITLE = 'Rick Astley - Never Gonna Give You Up'
const SAMPLE_SRT = path.join(__dirname, 'fixtures', 'sample.srt')

test.describe('Import happy path', () => {
  test('imports a video with URL, transcript, and tags', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    const importActions = new ImportActions(page)
    const importedVideo = {
      id: 'test-vid-1',
      youtube_url: RICK_ASTLEY_URL,
      youtube_id: 'dQw4w9WgXcQ',
      title: RICK_ASTLEY_TITLE,
      author_name: 'Rick Astley',
      thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg',
      transcript_path: '/tmp/test/transcripts/test-vid-1.srt',
      transcript_format: 'srt',
      tags: ['music', 'classic'],
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    }
    let videos: typeof importedVideo[] = []

    await page.route('**/api/videos', async route => {
      await route.fulfill({ json: videos })
    })

    await page.route('**/api/videos/import', async route => {
      videos = [importedVideo]
      await route.fulfill({ status: 201, json: importedVideo })
    })

    // 1. Load dashboard and assert empty state
    await dashboard.loadDashboard()
    await dashboard.assertEmpty()

    // 2. Open import modal
    await importActions.clickImportButton()

    // 3. Fill YouTube URL
    await importActions.fillYoutubeUrl(RICK_ASTLEY_URL)

    // 4. Upload transcript file
    await importActions.fillTranscriptFile(SAMPLE_SRT)

    // 5. Add tags
    await importActions.fillTags('music, classic')
    await expect(page.getByTestId('preview-container')).toBeVisible()

    // 6. Submit import
    await importActions.clickSubmitImport()

    // 7. Assert modal closes
    await expect(page.getByTestId('import-modal')).toBeHidden()

    // 8. Assert video card appears with correct title
    await dashboard.assertVideoCardCount(1)
    const firstCard = page.getByTestId(`video-card-${importedVideo.id}`)
    await expect(firstCard).toContainText(RICK_ASTLEY_TITLE)

    // 9. Assert tags visible on card
    await expect(firstCard).toContainText('music')
    await expect(firstCard).toContainText('classic')

    // 10. Reload page and assert card still present (persistence check)
    await dashboard.loadDashboard()
    await dashboard.assertVideoCardCount(1)
    await expect(page.getByTestId(`video-card-${importedVideo.id}`)).toContainText(RICK_ASTLEY_TITLE)
  })
})
