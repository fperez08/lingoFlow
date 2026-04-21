import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { PlayerPage } from './pages/PlayerPage'

const MOCK_VIDEO = {
  id: 'player-e2e-video-1',
  youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  youtube_id: 'dQw4w9WgXcQ',
  title: 'Rick Astley - Never Gonna Give You Up',
  author_name: 'Rick Astley',
  thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg',
  transcript_path: '/tmp/test/transcripts/player-e2e-video-1.srt',
  transcript_format: 'srt',
  tags: ['english', 'music'],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

const MOCK_CUES = [
  {
    index: 1,
    startTime: '00:00:01.000',
    endTime: '00:00:04.000',
    text: 'Never gonna give you up',
  },
  {
    index: 2,
    startTime: '00:00:05.000',
    endTime: '00:00:08.000',
    text: 'Never gonna let you down',
  },
]

const TEST_MP4 = path.join(__dirname, 'fixtures', 'test.mp4')

async function mockPlayerRoutes(page: Page): Promise<void> {
  await page.route(`**/api/videos/${MOCK_VIDEO.id}`, async route => {
    await route.fulfill({ json: MOCK_VIDEO })
  })

  await page.route(`**/api/videos/${MOCK_VIDEO.id}/transcript`, async route => {
    await route.fulfill({ json: { cues: MOCK_CUES } })
  })

  await page.route(`**/api/videos/${MOCK_VIDEO.id}/stream`, async route => {
    const mp4Buffer = fs.readFileSync(TEST_MP4)
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' },
      body: mp4Buffer,
    })
  })
}

test.describe('Player + mini-player workflow', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('opens player, plays, seeks, syncs transcript/progress, closes and reopens cleanly', async ({ page }) => {
    test.setTimeout(120_000)
    const consoleErrors: string[] = []
    const pageErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    page.on('pageerror', error => {
      pageErrors.push(error.message)
    })

    await mockPlayerRoutes(page)

    const player = new PlayerPage(page)
    await player.navigateTo(MOCK_VIDEO.id)
    await player.assertLoaded()

    await expect(page.getByRole('button', { name: 'Save Lesson' })).toHaveCount(0)
    await expect(player.playButton).toBeVisible()

    await player.clickPlay()
    await player.assertMiniPlayerOpen()
    await expect(player.playbackProgress).toBeVisible()

    // Cue clicking sets the active cue (no actual playback required)
    await page.getByTestId('cue-1').click()
    await expect(page.getByTestId('cue-1')).toHaveClass(/border-primary/)

    await player.closeMiniPlayer()
    await player.assertMiniPlayerClosed()
    await expect(player.playbackProgress).not.toBeVisible()

    await player.clickPlay()
    await player.assertMiniPlayerOpen()
    await expect(page.getByTestId('cue-0')).toHaveClass(/border-primary/)
    await expect(page.getByTestId('cue-1')).not.toHaveClass(/border-primary/)

    expect(consoleErrors).toEqual([])
    expect(pageErrors).toEqual([])
  })

  test('mini-player and vocabulary sidebar do not overlap when both are open', async ({ page }) => {
    test.setTimeout(60_000)

    await mockPlayerRoutes(page)

    const player = new PlayerPage(page)
    await player.navigateTo(MOCK_VIDEO.id)
    await player.assertLoaded()

    await player.clickPlay()
    await player.assertMiniPlayerOpen()

    // Click a word in the active transcript cue to open the vocabulary sidebar
    const wordButton = page.locator('[role="button"]').first()
    await expect(wordButton).toBeVisible()
    await wordButton.click()

    const wordSidebar = page.getByTestId('word-sidebar')
    await expect(wordSidebar).toBeVisible()
    await expect(player.miniPlayer).toBeVisible()

    // Confirm mini-player has shifted left (right offset > sidebar width)
    const miniPlayerBox = await player.miniPlayer.boundingBox()
    const sidebarBox = await wordSidebar.boundingBox()
    expect(miniPlayerBox).not.toBeNull()
    expect(sidebarBox).not.toBeNull()
    if (miniPlayerBox && sidebarBox) {
      // Mini-player right edge must not overlap sidebar left edge
      const miniPlayerRight = miniPlayerBox.x + miniPlayerBox.width
      const sidebarLeft = sidebarBox.x
      expect(miniPlayerRight).toBeLessThanOrEqual(sidebarLeft + 1) // 1px tolerance
    }
  })
    test.setTimeout(60_000)

    await mockPlayerRoutes(page)

    const player = new PlayerPage(page)
    await player.navigateTo(MOCK_VIDEO.id)
    await player.assertLoaded()

    await player.clickPlay()
    await player.assertMiniPlayerOpen()

    const rewindBtn = page.getByTestId('rewind-button')
    const fastforwardBtn = page.getByTestId('fastforward-button')

    await expect(rewindBtn).toBeVisible()
    await expect(fastforwardBtn).toBeVisible()

    const rewindLabel = await rewindBtn.getAttribute('aria-label')
    const fastforwardLabel = await fastforwardBtn.getAttribute('aria-label')

    expect(rewindLabel).not.toBe(fastforwardLabel)
    expect(rewindLabel).toBeTruthy()
    expect(fastforwardLabel).toBeTruthy()

    await rewindBtn.click()
    await fastforwardBtn.click()
  })

  test('mini-player and vocabulary sidebar do not overlap when both open', async ({ page }) => {
    test.setTimeout(60_000)

    await mockPlayerRoutes(page)

    const player = new PlayerPage(page)
    await player.navigateTo(MOCK_VIDEO.id)
    await player.assertLoaded()

    await player.clickPlay()
    await player.assertMiniPlayerOpen()

    // Click first cue to activate it, then click a word to open the sidebar
    await page.getByTestId('cue-0').click()
    const wordBtn = page.getByTestId('word-never').first()
    await expect(wordBtn).toBeVisible()
    await wordBtn.click()

    // Both mini-player and word sidebar must be visible
    await expect(player.miniPlayer).toBeVisible()
    await expect(page.getByTestId('word-sidebar')).toBeVisible()

    // Verify non-overlap: get bounding boxes
    const miniPlayerBox = await player.miniPlayer.boundingBox()
    const sidebarBox = await page.getByTestId('word-sidebar').boundingBox()

    expect(miniPlayerBox).not.toBeNull()
    expect(sidebarBox).not.toBeNull()

    if (miniPlayerBox && sidebarBox) {
      // They should not intersect horizontally (mini-player must be left of the sidebar)
      const miniPlayerRight = miniPlayerBox.x + miniPlayerBox.width
      const sidebarLeft = sidebarBox.x
      expect(miniPlayerRight).toBeLessThanOrEqual(sidebarLeft + 1) // 1px tolerance
    }
  })

  test('mini-player controls remain clickable while vocabulary sidebar is open', async ({ page }) => {
    test.setTimeout(60_000)

    await mockPlayerRoutes(page)

    const player = new PlayerPage(page)
    await player.navigateTo(MOCK_VIDEO.id)
    await player.assertLoaded()

    await player.clickPlay()
    await player.assertMiniPlayerOpen()

    // Open vocabulary sidebar by clicking a word
    await page.getByTestId('cue-0').click()
    const wordBtn = page.getByTestId('word-never').first()
    await expect(wordBtn).toBeVisible()
    await wordBtn.click()
    await expect(page.getByTestId('word-sidebar')).toBeVisible()

    // Mini-player controls must be visible and clickable
    const rewindBtn = page.getByTestId('rewind-button')
    const fastforwardBtn = page.getByTestId('fastforward-button')
    const closeBtn = page.getByTestId('mini-player-close')

    await expect(rewindBtn).toBeVisible()
    await expect(fastforwardBtn).toBeVisible()
    await expect(closeBtn).toBeVisible()

    // Verify controls are not obscured — clicking should not throw
    await rewindBtn.click()
    await fastforwardBtn.click()
  })

  test('mini-player uses default position when sidebar is closed', async ({ page }) => {
    test.setTimeout(60_000)

    await mockPlayerRoutes(page)

    const player = new PlayerPage(page)
    await player.navigateTo(MOCK_VIDEO.id)
    await player.assertLoaded()

    await player.clickPlay()
    await player.assertMiniPlayerOpen()

    // Sidebar is closed — mini-player should be at default right-4 position
    await expect(page.getByTestId('word-sidebar')).not.toBeVisible()
    const miniPlayerBox = await player.miniPlayer.boundingBox()
    expect(miniPlayerBox).not.toBeNull()

    if (miniPlayerBox) {
      const viewportWidth = page.viewportSize()?.width ?? 1280
      // With right-4 (16px), the mini-player right edge should be near the viewport right
      const miniPlayerRight = miniPlayerBox.x + miniPlayerBox.width
      expect(miniPlayerRight).toBeGreaterThan(viewportWidth - 32) // within 32px of right edge
    }
  })

  test('mini-player and vocabulary sidebar are both visible simultaneously', async ({ page }) => {
    test.setTimeout(60_000)

    await mockPlayerRoutes(page)

    const player = new PlayerPage(page)
    await player.navigateTo(MOCK_VIDEO.id)
    await player.assertLoaded()

    // Open mini-player
    await player.clickPlay()
    await player.assertMiniPlayerOpen()

    // Click first cue to make it active
    await page.getByTestId('cue-0').click()

    // Click a word in the active cue to open vocabulary sidebar
    // The active cue renders words via CueText as <button> elements
    const firstWord = page.getByTestId('cue-0').locator('button').first()
    await expect(firstWord).toBeVisible({ timeout: 5000 })
    await firstWord.click()

    // Both overlays should be visible
    await expect(player.miniPlayer).toBeVisible()
    await expect(page.getByTestId('word-sidebar')).toBeVisible()

    // Mini-player controls should remain interactive
    await expect(page.getByTestId('mini-player-play-pause')).toBeVisible()
    await expect(page.getByTestId('rewind-button')).toBeVisible()
    await expect(page.getByTestId('fastforward-button')).toBeVisible()
  })
})
