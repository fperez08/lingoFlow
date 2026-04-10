/**
 * E2E spec: dashboard loading, empty, and loaded state assertions
 *
 * Uses page.route() to intercept GET /api/videos so these tests are fully
 * isolated from the database and run deterministically in any environment.
 *
 * Scenarios:
 *  1. loading → empty  : delayed empty response; loading-indicator appears first
 *  2. empty state      : instant empty response; empty-state visible, no video-grid
 *  3. loaded state     : one mock video; video-grid visible with 1 card
 *  4. no loading after : loading-indicator hidden once response is received
 */

import { test, expect } from '@playwright/test'
import { DashboardPage } from './pages/DashboardPage'

const MOCK_VIDEO = {
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

test.describe('Dashboard states', () => {
  test('shows loading indicator then empty state', async ({ page }) => {
    const dashboard = new DashboardPage(page)

    await page.route('**/api/videos', async route => {
      await new Promise<void>(resolve => setTimeout(resolve, 300))
      await route.fulfill({ json: [] })
    })

    await page.goto('/dashboard')
    await dashboard.assertLoading()
    await dashboard.assertEmpty()
  })

  test('shows empty state when no videos are returned', async ({ page }) => {
    const dashboard = new DashboardPage(page)

    await page.route('**/api/videos', async route => {
      await route.fulfill({ json: [] })
    })

    await dashboard.loadDashboard()
    await dashboard.assertEmpty()
    await expect(page.getByTestId('video-grid')).not.toBeVisible()
  })

  test('shows video grid with correct card count after seeding a video', async ({ page }) => {
    const dashboard = new DashboardPage(page)

    await page.route('**/api/videos', async route => {
      await route.fulfill({ json: [MOCK_VIDEO] })
    })

    await dashboard.loadDashboard()

    const grid = page.getByTestId('video-grid')
    await expect(grid).toBeVisible()

    const count = await dashboard.getVideoCardCount()
    expect(count).toBe(1)
  })

  test('hides loading indicator after response is received', async ({ page }) => {
    const dashboard = new DashboardPage(page)

    await page.route('**/api/videos', async route => {
      await route.fulfill({ json: [MOCK_VIDEO] })
    })

    await dashboard.loadDashboard()
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()
  })
})
