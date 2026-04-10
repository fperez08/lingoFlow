/**
 * E2E spec: edit tags workflow with persistence (issue #60)
 *
 * Tests the full tag-editing flow: importing a video with an initial tag,
 * opening the edit modal, removing the old tag, adding new tags, saving,
 * verifying the UI updates immediately, reloading, and confirming persistence.
 */

import { test, expect } from '@playwright/test'
import { DashboardPage } from './pages/DashboardPage'
import { EditActions } from './pages/EditActions'

test.describe('Edit tags', () => {
  test('edits tags and persists after reload', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    const editActions = new EditActions(page)
    const initialVideo = {
      id: 'test-vid-1',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      youtube_id: 'dQw4w9WgXcQ',
      title: 'Rick Astley - Never Gonna Give You Up',
      author_name: 'Rick Astley',
      thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg',
      transcript_path: '/tmp/test/transcripts/test-vid-1.srt',
      transcript_format: 'srt',
      tags: ['oldTag'],
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    }
    let video = initialVideo

    await page.route('**/api/videos', async route => {
      await route.fulfill({ json: [video] })
    })

    await page.route(`**/api/videos/${initialVideo.id}`, async route => {
      if (route.request().method() !== 'PATCH') {
        await route.continue()
        return
      }

      video = {
        ...video,
        tags: ['newTag1', 'newTag2'],
        updated_at: '2024-01-02T00:00:00.000Z',
      }
      await route.fulfill({ status: 200, json: video })
    })

    // 1. Load dashboard with one video
    await dashboard.loadDashboard()
    await dashboard.assertVideoCardCount(1)
    await expect(page.getByTestId(`video-card-${initialVideo.id}`)).toContainText('oldTag')

    // 2. Open edit modal on the first card
    await editActions.clickEditOnCard(0)

    // 3. Remove existing tag and add new tags
    await editActions.removeTag('oldTag')
    await editActions.addTag('newTag1')
    await editActions.addTag('newTag2')

    // 4. Save and wait for modal to close
    await editActions.clickSave()

    // 5. Verify UI reflects new tags immediately
    await editActions.assertTagsSaved(['newTag1', 'newTag2'])

    // 6. Reload page and confirm tags persisted
    await dashboard.loadDashboard()
    const cardAfterReload = page.getByTestId(`video-card-${initialVideo.id}`)
    await expect(cardAfterReload).toContainText('newTag1')
    await expect(cardAfterReload).toContainText('newTag2')
    await expect(cardAfterReload).not.toContainText('oldTag')
  })
})
