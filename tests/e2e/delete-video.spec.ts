/**
 * E2E spec: delete video workflow
 *
 * Uses page.route() to intercept API calls so tests are fully isolated from
 * the database and run deterministically in any environment.
 *
 * Scenarios:
 *  1. Single video delete → empty state : delete the only video; empty-state visible after
 *  2. Multi-video delete → remaining cards : delete first of two; one card remains
 */

import { test, expect } from '@playwright/test'
import { DashboardPage } from './pages/DashboardPage'
import { DeleteActions } from './pages/DeleteActions'

const MOCK_VIDEO_1 = {
  id: 'test-vid-1',
  youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  youtube_id: 'dQw4w9WgXcQ',
  title: 'Rick Astley - Never Gonna Give You Up',
  author_name: 'RickAstleyVEVO',
  thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg',
  transcript_path: '/tmp/test/transcripts/test-vid-1.srt',
  transcript_format: 'srt',
  tags: ['music', 'classic'],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

const MOCK_VIDEO_2 = {
  id: 'test-vid-2',
  youtube_url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
  youtube_id: '9bZkp7q19f0',
  title: 'PSY - GANGNAM STYLE',
  author_name: 'officialpsy',
  thumbnail_url: 'https://img.youtube.com/vi/9bZkp7q19f0/0.jpg',
  transcript_path: '/tmp/test/transcripts/test-vid-2.srt',
  transcript_format: 'srt',
  tags: ['kpop'],
  created_at: '2024-01-02T00:00:00.000Z',
  updated_at: '2024-01-02T00:00:00.000Z',
}

test.describe('Delete video workflow', () => {
  // Use a taller viewport so the dashboard page content fits without being
  // clipped by the body's flex `align-items: center` layout.
  test.use({ viewport: { width: 1280, height: 1200 } })
  test('single video delete → empty state appears', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    const deleteActions = new DeleteActions(page)

    // Register fallback first (lower precedence): post-delete GET returns empty
    await page.route('**/api/videos', async route => {
      await route.fulfill({ json: [] })
    })
    // Register single-use route second (higher precedence): initial GET returns the video
    await page.route('**/api/videos', async route => {
      await route.fulfill({ json: [MOCK_VIDEO_1] })
    }, { times: 1 })

    await page.route(`**/api/videos/${MOCK_VIDEO_1.id}`, async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204, body: '' })
      } else {
        await route.continue()
      }
    })

    await dashboard.loadDashboard()
    expect(await dashboard.getVideoCardCount()).toBe(1)

    await deleteActions.clickDeleteOnCard(0)
    await deleteActions.confirmDelete()

    await deleteActions.assertCardRemoved(MOCK_VIDEO_1.id)
    await dashboard.assertEmpty()
  })

  test('multi-video delete → remaining card still visible', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    const deleteActions = new DeleteActions(page)

    // Register fallback first (lower precedence): post-delete GET returns only video 2
    await page.route('**/api/videos', async route => {
      await route.fulfill({ json: [MOCK_VIDEO_2] })
    })
    // Register single-use route second (higher precedence): initial GET returns both videos
    await page.route('**/api/videos', async route => {
      await route.fulfill({ json: [MOCK_VIDEO_1, MOCK_VIDEO_2] })
    }, { times: 1 })

    await page.route(`**/api/videos/${MOCK_VIDEO_1.id}`, async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204, body: '' })
      } else {
        await route.continue()
      }
    })

    await dashboard.loadDashboard()
    expect(await dashboard.getVideoCardCount()).toBe(2)

    await deleteActions.clickDeleteOnCard(0)
    await deleteActions.confirmDelete()

    await deleteActions.assertCardRemoved(MOCK_VIDEO_1.id)
    expect(await dashboard.getVideoCardCount()).toBe(1)
    await expect(page.getByTestId(`video-card-${MOCK_VIDEO_2.id}`)).toBeVisible()
  })
})
