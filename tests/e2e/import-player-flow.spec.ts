import { test, expect } from '@playwright/test'
import path from 'path'
import { DashboardPage } from './pages/DashboardPage'
import { ImportActions } from './pages/ImportActions'
import { PlayerPage } from './pages/PlayerPage'

const LOCAL_VIDEO_TITLE = 'Fire Drill Safety'
const FIRE_DRILL_SRT = path.join(__dirname, 'fixtures', 'fire-drill.srt')
const TEST_MP4 = path.join(__dirname, 'fixtures', 'test.mp4')

test.describe('Import → player → transcript → delete integration', () => {
  test.use({ viewport: { width: 1280, height: 1200 } })

  test('imports video, opens player/transcript, plays lesson, and deletes video', async ({ page }) => {
    test.setTimeout(120_000)

    const dashboard = new DashboardPage(page)
    const importActions = new ImportActions(page)
    const player = new PlayerPage(page)
    const uniqueTag = `flow-${Date.now()}`
    const importedCard = page
      .locator('[data-testid^="video-card-"]')
      .filter({ hasText: LOCAL_VIDEO_TITLE })
      .filter({ hasText: uniqueTag })
      .first()

    await dashboard.loadDashboard()

    await importActions.clickImportButton()
    await importActions.fillVideoFile(TEST_MP4)
    await importActions.fillTitle(LOCAL_VIDEO_TITLE)
    await expect(page.getByTestId('preview-container')).toBeHidden()

    await importActions.fillTranscriptFile(FIRE_DRILL_SRT)
    await importActions.fillTags(`english, office, ${uniqueTag}`)
    await importActions.clickSubmitImport()
    await expect(page.getByTestId('import-modal')).toBeHidden()
    await expect(importedCard).toBeVisible()

    const cardTestId = await importedCard.getAttribute('data-testid')
    const videoId = cardTestId?.replace('video-card-', '')
    if (!videoId) {
      throw new Error('Imported video card missing expected data-testid')
    }

    await importedCard.locator(`a[href="/player/${videoId}"]`).first().click()
    await player.assertLoaded()
    await expect(page).toHaveURL(new RegExp(`/player/${videoId}$`))

    await expect(page.getByTestId('cue-0')).toBeVisible()
    await expect(page.getByTestId('cue-31')).toBeVisible()
    await expect(page.locator('[data-testid^="cue-"]')).toHaveCount(32)

    await player.clickPlay()
    await player.assertMiniPlayerOpen()
    await expect(page.getByTestId('playback-progress')).toBeVisible()

    await page.goto('/dashboard', { waitUntil: 'networkidle' })
    await expect(importedCard).toBeVisible()
    await importedCard.getByTestId('delete-button').click()
    await expect(page.getByTestId('delete-modal')).toBeVisible()
    await page.getByTestId('confirm-delete-button').click()
    await expect(page.getByTestId('delete-modal')).toBeHidden()
    await expect(importedCard).toHaveCount(0)
  })
})
