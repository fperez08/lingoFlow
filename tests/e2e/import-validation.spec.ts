/**
 * E2E spec: import form validation — bad URL, unsupported extension, missing fields
 *
 * Verifies that client-side validation (canSubmit gate) and server-side
 * validation (400/422 responses) surface the correct user-facing error messages.
 *
 * Scenarios:
 *   1. Plain invalid URL  → preview error + submit disabled
 *   2. Non-YouTube URL    → preview error + submit disabled
 *   3. Valid URL, no file → submit button disabled
 *   4. Valid URL + .doc   → submit → server 400 → import-error "Invalid file extension"
 *   5. Bad URL → fix URL + add file → error clears + submit re-enabled
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import { DashboardPage } from './pages/DashboardPage'
import { ImportActions } from './pages/ImportActions'

const SAMPLE_SRT = path.join(__dirname, 'fixtures', 'sample.srt')

test.describe('Import form validation', () => {
  test.beforeEach(async ({ page }) => {
    const dashboard = new DashboardPage(page)
    const importActions = new ImportActions(page)
    await dashboard.loadDashboard()
    await importActions.clickImportButton()
  })

  test('1 — plain invalid URL shows preview error and disables submit', async ({ page }) => {
    const importActions = new ImportActions(page)

    await importActions.fillYoutubeUrl('not-a-url')

    await expect(page.getByTestId('url-preview-error')).toBeVisible()

    const submitBtn = page.getByTestId('submit-import-button')
    await expect(submitBtn).toBeDisabled()
  })

  test('2 — non-YouTube URL shows preview error and disables submit', async ({ page }) => {
    const importActions = new ImportActions(page)

    
    await expect(page.getByTestId('url-preview-error')).toBeVisible()

    const submitBtn = page.getByTestId('submit-import-button')
    await expect(submitBtn).toBeDisabled()
  })

  test('3 — valid URL with no transcript file keeps submit disabled', async ({ page }) => {
    const importActions = new ImportActions(page)

    await importActions.fillYoutubeUrl(RICK_ASTLEY_URL)
    await expect(page.getByTestId('url-preview-error')).toBeHidden()
    await expect(page.getByTestId('preview-container')).toBeVisible()

    const submitBtn = page.getByTestId('submit-import-button')
    await expect(submitBtn).toBeDisabled()
  })

  test('4 — valid URL + .doc file → server 400 shows "Invalid file extension" error', async ({ page }) => {
    const importActions = new ImportActions(page)

    await importActions.fillYoutubeUrl(RICK_ASTLEY_URL)
    await expect(page.getByTestId('url-preview-error')).toBeHidden()
    await expect(page.getByTestId('preview-container')).toBeVisible()

    await importActions.fillTranscriptFile({
      name: 'transcript.doc',
      mimeType: 'application/msword',
      buffer: Buffer.from('fake doc content'),
    })

    await importActions.clickSubmitImport()
    await importActions.assertValidationError('Invalid file extension')
  })

  test('5 — bad URL fixed to valid URL + file clears error and re-enables submit', async ({ page }) => {
    const importActions = new ImportActions(page)

    // Enter invalid URL first
    await importActions.fillYoutubeUrl('not-a-url')
    await expect(page.getByTestId('url-preview-error')).toBeVisible()

    // Fix URL and add valid transcript file
        await importActions.fillYoutubeUrl(RICK_ASTLEY_URL)

    // Wait for preview to load and error to clear
    await expect(page.getByTestId('url-preview-error')).toBeHidden()
    await expect(page.getByTestId('preview-container')).toBeVisible()

    await importActions.fillTranscriptFile(SAMPLE_SRT)

    const submitBtn = page.getByTestId('submit-import-button')
    await expect(submitBtn).toBeEnabled()
  })
})
