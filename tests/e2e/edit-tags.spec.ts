/**
 * E2E spec: edit tags workflow with persistence (issue #60)
 *
 * Tests the full tag-editing flow: importing a video with an initial tag,
 * opening the edit modal, removing the old tag, adding new tags, saving,
 * verifying the UI updates immediately, reloading, and confirming persistence.
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import { DashboardPage } from './pages/DashboardPage'
import { ImportActions } from './pages/ImportActions'
import { EditActions } from './pages/EditActions'
import { DeleteActions } from './pages/DeleteActions'

const RICK_ASTLEY_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const SAMPLE_SRT = path.join(__dirname, 'fixtures', 'sample.srt')

test.describe('Edit tags', () => {
  test('edits tags and persists after reload', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    const importActions = new ImportActions(page)
    const editActions = new EditActions(page)
    const deleteActions = new DeleteActions(page)

    // 1. Load dashboard and seed a video via import UI with an initial tag
    await dashboard.loadDashboard()
    await importActions.clickImportButton()
    await importActions.fillYoutubeUrl(RICK_ASTLEY_URL)
    await importActions.fillTranscriptFile(SAMPLE_SRT)
    await importActions.fillTags('oldTag')
    await importActions.clickSubmitImport()
    await page.getByTestId('import-modal').waitFor({ state: 'hidden' })

    // 2. Verify the video card is present
    const cards = await dashboard.getVideoCards()
    expect(cards.length).toBeGreaterThanOrEqual(1)

    // 3. Open edit modal on the first card
    await editActions.clickEditOnCard(0)

    // 4. Remove existing tag and add new tags
    await editActions.removeTag('oldTag')
    await editActions.addTag('newTag1')
    await editActions.addTag('newTag2')

    // 5. Save and wait for modal to close
    await editActions.clickSave()

    // 6. Verify UI reflects new tags immediately
    await editActions.assertTagsSaved(['newTag1', 'newTag2'])

    // 7. Reload page and confirm tags persisted
    await dashboard.loadDashboard()
    await editActions.assertTagsSaved(['newTag1', 'newTag2'])

    // 8. Clean up: delete the video so subsequent tests start with a clean state
    await deleteActions.clickDeleteOnCard(0)
    await deleteActions.confirmDelete()
  })
})
