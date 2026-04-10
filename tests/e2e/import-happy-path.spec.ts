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

    // 6. Submit import
    await importActions.clickSubmitImport()

    // 7. Assert modal closes
    await page.getByTestId('import-modal').waitFor({ state: 'hidden' })

    // 8. Assert video card appears with correct title
    const cards = await dashboard.getVideoCards()
    expect(cards.length).toBeGreaterThanOrEqual(1)

    const firstCard = cards[0]
    await expect(firstCard).toContainText(RICK_ASTLEY_TITLE)

    // 9. Assert tags visible on card
    await expect(firstCard).toContainText('music')
    await expect(firstCard).toContainText('classic')

    // 10. Reload page and assert card still present (persistence check)
    await dashboard.loadDashboard()
    const cardsAfterReload = await dashboard.getVideoCards()
    expect(cardsAfterReload.length).toBeGreaterThanOrEqual(1)
    await expect(cardsAfterReload[0]).toContainText(RICK_ASTLEY_TITLE)
  })
})
