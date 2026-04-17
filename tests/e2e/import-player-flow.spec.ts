import { test, expect } from '@playwright/test'
import path from 'path'
import { DashboardPage } from './pages/DashboardPage'
import { ImportActions } from './pages/ImportActions'
import { PlayerPage } from './pages/PlayerPage'

const FIRE_DRILL_URL = 'https://www.youtube.com/watch?v=gO8N3L_aERg'
const FIRE_DRILL_TITLE = 'Fire Drill - The Office US'
const FIRE_DRILL_SRT = path.join(__dirname, 'fixtures', 'fire-drill.srt')

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
      .filter({ hasText: FIRE_DRILL_TITLE })
      .filter({ hasText: uniqueTag })
      .first()

    await dashboard.loadDashboard()

    await importActions.clickImportButton()
    await importActions.fillYoutubeUrl(FIRE_DRILL_URL)
    await expect(page.getByTestId('url-preview-error')).toBeHidden()
    await expect(page.getByTestId('preview-container')).toBeVisible()
    await expect(page.getByTestId('preview-container')).toContainText(FIRE_DRILL_TITLE)

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
    await page.waitForFunction(
      () => {
        const duration = document.querySelector('[data-testid="duration"]')?.textContent
        return typeof duration === 'string' && duration !== '0:00'
      },
      undefined,
      { timeout: 45_000 }
    )

    await page.goto('/dashboard', { waitUntil: 'networkidle' })
    await expect(importedCard).toBeVisible()
    await importedCard.getByTestId('delete-button').click()
    await expect(page.getByTestId('delete-modal')).toBeVisible()
    await page.getByTestId('confirm-delete-button').click()
    await expect(page.getByTestId('delete-modal')).toBeHidden()
    await expect(importedCard).toHaveCount(0)
  })
})
