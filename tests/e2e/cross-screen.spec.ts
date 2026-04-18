/**
 * E2E spec: cross-screen completion pass (#106)
 *
 * Verifies that the vocabulary and player screens render correctly,
 * and that the dashboard correctly handles empty and loaded states.
 * All API calls are intercepted with page.route() so no real DB is required.
 */

import { test, expect } from '@playwright/test'
import { DashboardPage } from './pages/DashboardPage'
import { VocabularyPage } from './pages/VocabularyPage'
import { PlayerPage } from './pages/PlayerPage'

const MOCK_VIDEO = {
  id: 'mock-vid-1',
  title: 'Sample Local Video',
  author_name: 'Local Author',
  thumbnail_url: '',
  transcript_path: null,
  transcript_format: null,
  tags: ['music'],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

test.describe('Cross-screen: Vocabulary page', () => {
  const MOCK_VOCAB_ENTRIES = [
    { word: 'ethereal', status: 'new', level: 'B2', definition: 'Extremely delicate' },
    { word: 'eloquent', status: 'new', level: 'B1', definition: 'Fluent or persuasive' },
    { word: 'serendipity', status: 'learning', level: 'B2', definition: 'Happy chance' },
  ]

  test('renders the vocabulary manager heading', async ({ page }) => {
    await page.route('**/api/vocabulary', async route => {
      await route.fulfill({ json: MOCK_VOCAB_ENTRIES })
    })
    const vocab = new VocabularyPage(page)
    await vocab.navigateTo()
    await vocab.assertLoaded()
    await expect(vocab.heading).toContainText('Vocabulary Manager')
  })

  test('renders word cards in the New Words tab', async ({ page }) => {
    await page.route('**/api/vocabulary', async route => {
      await route.fulfill({ json: MOCK_VOCAB_ENTRIES })
    })
    const vocab = new VocabularyPage(page)
    await vocab.navigateTo()
    await vocab.assertLoaded()
    const count = await vocab.getCardCount()
    expect(count).toBeGreaterThan(0)
  })

  test('search filters vocab cards', async ({ page }) => {
    await page.route('**/api/vocabulary', async route => {
      await route.fulfill({ json: MOCK_VOCAB_ENTRIES })
    })
    const vocab = new VocabularyPage(page)
    await vocab.navigateTo()
    await vocab.assertLoaded()
    await vocab.search('zzzzz_no_match')
    await expect(page.getByTestId('empty-vocab-state')).toBeVisible()
  })

  test('tab switching works', async ({ page }) => {
    await page.route('**/api/vocabulary', async route => {
      await route.fulfill({ json: MOCK_VOCAB_ENTRIES })
    })
    const vocab = new VocabularyPage(page)
    await vocab.navigateTo()
    await vocab.assertLoaded()
    await vocab.clickTab('mastered')
    await expect(page.getByTestId('tab-mastered')).toBeVisible()
  })
})

test.describe('Cross-screen: Dashboard page', () => {
  test('shows empty state when no videos', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await page.route('**/api/videos', async route => {
      await route.fulfill({ json: [] })
    })
    await dashboard.loadDashboard()
    await dashboard.assertEmpty()
  })

  test('shows video grid when videos exist', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await page.route('**/api/videos', async route => {
      await route.fulfill({ json: [MOCK_VIDEO] })
    })
    await dashboard.loadDashboard()
    await dashboard.assertVideoCardCount(1)
    await expect(page.getByTestId(`video-card-${MOCK_VIDEO.id}`)).toContainText(MOCK_VIDEO.title)
  })
})

test.describe('Cross-screen: Player page', () => {
  test('renders the player client for a known video', async ({ page }) => {
    const player = new PlayerPage(page)

    await page.route(`**/api/videos/${MOCK_VIDEO.id}`, async route => {
      await route.fulfill({ json: MOCK_VIDEO })
    })
    await page.route(`**/api/videos/${MOCK_VIDEO.id}/transcript`, async route => {
      await route.fulfill({ json: { cues: [] } })
    })
    await page.route('**/api/vocabulary', async route => {
      await route.fulfill({ json: [] })
    })

    await player.navigateTo(MOCK_VIDEO.id)
    await player.assertLoaded()
  })

  test('transcript is visible without tab navigation', async ({ page }) => {
    const player = new PlayerPage(page)

    await page.route(`**/api/videos/${MOCK_VIDEO.id}`, async route => {
      await route.fulfill({ json: MOCK_VIDEO })
    })
    await page.route(`**/api/videos/${MOCK_VIDEO.id}/transcript`, async route => {
      await route.fulfill({ json: { cues: [] } })
    })
    await page.route('**/api/vocabulary', async route => {
      await route.fulfill({ json: [] })
    })

    await player.navigateTo(MOCK_VIDEO.id)
    await player.assertLoaded()
    await expect(page.getByTestId('tab-vocabulary')).not.toBeAttached()
  })
})
