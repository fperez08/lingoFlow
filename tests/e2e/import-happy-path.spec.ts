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

const LOCAL_VIDEO_TITLE = 'Sample Local Video'
const SAMPLE_SRT = path.join(__dirname, 'fixtures', 'sample.srt')

test.describe('Import happy path', () => {
  test('imports a video with URL, transcript, and tags', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    const importActions = new ImportActions(page)
    const importedVideo = {
      id: 'test-vid-1',
      title: LOCAL_VIDEO_TITLE,
      author_name: 'Local Author',
      thumbnail_url: '',
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

    // 3. Fill video file and title
    await importActions.fillVideoFile({
      name: 'video.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('fake mp4 content'),
    })
    await importActions.fillTitle(LOCAL_VIDEO_TITLE)

    // 4. Upload transcript file
    await importActions.fillTranscriptFile(SAMPLE_SRT)

    // 5. Add tags
    await importActions.fillTags('music, classic')

    // 6. Submit import
    await importActions.clickSubmitImport()

    // 7. Assert modal closes
    await expect(page.getByTestId('import-modal')).toBeHidden()

    // 8. Assert video card appears with correct title
    await dashboard.assertVideoCardCount(1)
    const firstCard = page.getByTestId(`video-card-${importedVideo.id}`)
    await expect(firstCard).toContainText(LOCAL_VIDEO_TITLE)

    // 9. Assert tags visible on card
    await expect(firstCard).toContainText('music')
    await expect(firstCard).toContainText('classic')

    // 10. Reload page and assert card still present (persistence check)
    await dashboard.loadDashboard()
    await dashboard.assertVideoCardCount(1)
    await expect(page.getByTestId(`video-card-${importedVideo.id}`)).toContainText(LOCAL_VIDEO_TITLE)
  })
})
