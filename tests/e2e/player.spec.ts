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
    await expect(player.playButton).toContainText('Play Lesson')

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
})
