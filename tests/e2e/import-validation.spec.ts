/**
 * E2E spec: import form validation — missing fields, unsupported extension
 *
 * Verifies that client-side validation (canSubmit gate) and server-side
 * validation (400/422 responses) surface the correct user-facing error messages.
 *
 * Scenarios:
 *   1. No video file selected  → submit disabled
 *   2. Video file but no title → submit disabled
 *   3. Valid video + title + no transcript → submit disabled
 *   4. Valid video + title + .doc transcript → server 400 → "Invalid file extension"
 *   5. Add all required fields → submit enabled
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import { DashboardPage } from './pages/DashboardPage'
import { ImportActions } from './pages/ImportActions'

const SAMPLE_SRT = path.join(__dirname, 'fixtures', 'sample.srt')
const TEST_MP4 = path.join(__dirname, 'fixtures', 'test.mp4')

const FAKE_VIDEO = {
  name: 'video.mp4',
  mimeType: 'video/mp4',
  buffer: Buffer.from('fake mp4 content'),
}

test.describe('Import form validation', () => {
  test.beforeEach(async ({ page }) => {
    const dashboard = new DashboardPage(page)
    const importActions = new ImportActions(page)
    await dashboard.loadDashboard()
    await importActions.clickImportButton()
  })

  test('1 — no video file selected keeps submit disabled', async ({ page }) => {
    const submitBtn = page.getByTestId('submit-import-button')
    await expect(submitBtn).toBeDisabled()
  })

  test('2 — video file selected but no title keeps submit disabled', async ({ page }) => {
    const importActions = new ImportActions(page)

    await importActions.fillVideoFile(FAKE_VIDEO)

    const submitBtn = page.getByTestId('submit-import-button')
    await expect(submitBtn).toBeDisabled()
  })

  test('3 — valid video + title with no transcript file keeps submit disabled', async ({ page }) => {
    const importActions = new ImportActions(page)

    await importActions.fillVideoFile(FAKE_VIDEO)
    await importActions.fillTitle('Test Video')

    const submitBtn = page.getByTestId('submit-import-button')
    await expect(submitBtn).toBeDisabled()
  })

  test('4 — valid video + title + .doc file → server 400 shows "Invalid file extension" error', async ({ page }) => {
    const importActions = new ImportActions(page)

    await importActions.fillVideoFile({ name: 'video.mp4', mimeType: 'video/mp4', buffer: Buffer.from('fake') })
    await importActions.fillTitle('Test Video')
    await importActions.fillTranscriptFile({
      name: 'transcript.doc',
      mimeType: 'application/msword',
      buffer: Buffer.from('fake doc content'),
    })

    await importActions.clickSubmitImport()
    await importActions.assertValidationError('Invalid file extension')
  })

  test('5 — adding video + title + transcript clears disabled state and enables submit', async ({ page }) => {
    const importActions = new ImportActions(page)

    await importActions.fillVideoFile(FAKE_VIDEO)
    await importActions.fillTitle('Test Video')
    await importActions.fillTranscriptFile(SAMPLE_SRT)

    const submitBtn = page.getByTestId('submit-import-button')
    await expect(submitBtn).toBeEnabled()
  })
})

