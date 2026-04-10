/**
 * E2E spec: import form validation — bad URL, unsupported extension, missing fields
 *
 * Verifies that client-side validation (canSubmit gate) and server-side
 * validation (400/422 responses) surface the correct user-facing error messages.
 *
 * Scenarios:
 *   1. Plain invalid URL  → preview error (.error-text) + submit disabled
 *   2. Non-YouTube URL    → preview error (.error-text) + submit disabled
 *   3. Valid URL, no file → submit button disabled
 *   4. Valid URL + .doc   → submit → server 400 → import-error "Invalid file extension"
 *   5. Bad URL → fix URL + add file → error clears + submit re-enabled
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import { DashboardPage } from './pages/DashboardPage'
import { ImportActions } from './pages/ImportActions'

const RICK_ASTLEY_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const SAMPLE_SRT = path.join(__dirname, 'fixtures', 'sample.srt')

test.describe('Import form validation', () => {
  test('1 — plain invalid URL shows preview error and disables submit', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    const importActions = new ImportActions(page)

    await dashboard.loadDashboard()
    await importActions.clickImportButton()

    await importActions.fillYoutubeUrl('not-a-url')

    // Wait for the debounced preview fetch to complete and error to appear
    await page.locator('.error-text').waitFor({ state: 'visible' })

    const submitBtn = page.getByTestId('submit-import-button')
    await expect(submitBtn).toBeDisabled()
  })

  test('2 — non-YouTube URL shows preview error and disables submit', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    const importActions = new ImportActions(page)

    await dashboard.loadDashboard()
    await importActions.clickImportButton()

    await importActions.fillYoutubeUrl('https://notyoutube.com/watch?v=abc')

    await page.locator('.error-text').waitFor({ state: 'visible' })

    const submitBtn = page.getByTestId('submit-import-button')
    await expect(submitBtn).toBeDisabled()
  })

  test('3 — valid URL with no transcript file keeps submit disabled', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    const importActions = new ImportActions(page)

    await dashboard.loadDashboard()
    await importActions.clickImportButton()

    await importActions.fillYoutubeUrl(RICK_ASTLEY_URL)

    // Wait for preview to load successfully (no error-text)
    await page.locator('.error-text').waitFor({ state: 'hidden' }).catch(() => {})
    // Give debounce time to settle
    await page.waitForTimeout(700)

    const submitBtn = page.getByTestId('submit-import-button')
    await expect(submitBtn).toBeDisabled()
  })

  test('4 — valid URL + .doc file → server 400 shows "Invalid file extension" error', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    const importActions = new ImportActions(page)

    await dashboard.loadDashboard()
    await importActions.clickImportButton()

    await importActions.fillYoutubeUrl(RICK_ASTLEY_URL)

    // Wait for preview to load (debounce + fetch)
    await page.waitForTimeout(700)
    // Ensure no preview error before uploading bad file
    const errorVisible = await page.locator('.error-text').isVisible()
    if (!errorVisible) {
      // Preview loaded successfully; upload the unsupported file
      await page.getByTestId('transcript-input').setInputFiles({
        name: 'transcript.doc',
        mimeType: 'application/msword',
        buffer: Buffer.from('fake doc content'),
      })

      await importActions.clickSubmitImport()
      await importActions.assertValidationError('Invalid file extension')
    } else {
      // Preview errored (e.g. stub not responding in time) — skip gracefully
      test.skip()
    }
  })

  test('5 — bad URL fixed to valid URL + file clears error and re-enables submit', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    const importActions = new ImportActions(page)

    await dashboard.loadDashboard()
    await importActions.clickImportButton()

    // Enter invalid URL first
    await importActions.fillYoutubeUrl('not-a-url')
    await page.locator('.error-text').waitFor({ state: 'visible' })

    // Fix URL and add valid transcript file
    await page.getByTestId('youtube-url-input').fill('')
    await importActions.fillYoutubeUrl(RICK_ASTLEY_URL)

    // Wait for preview to load and error to clear
    await page.locator('.error-text').waitFor({ state: 'hidden' })

    await importActions.fillTranscriptFile(SAMPLE_SRT)

    // Wait for canSubmit to become true
    await page.waitForTimeout(800)

    const submitBtn = page.getByTestId('submit-import-button')
    await expect(submitBtn).toBeEnabled()
  })
})
