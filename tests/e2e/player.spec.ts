import { test, expect, type Page } from '@playwright/test'
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

function parseClock(clock: string): number {
  const [minutes, seconds] = clock.split(':').map(Number)
  return minutes * 60 + seconds
}

async function mockPlayerRoutes(page: Page): Promise<void> {
  await page.route(`**/api/videos/${MOCK_VIDEO.id}`, async route => {
    await route.fulfill({ json: MOCK_VIDEO })
  })

  await page.route(`**/api/videos/${MOCK_VIDEO.id}/transcript`, async route => {
    await route.fulfill({ json: { cues: MOCK_CUES } })
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

    await page.waitForFunction(
      () => {
        const duration = document.querySelector('[data-testid="duration"]')?.textContent
        return duration !== undefined && duration !== null && duration !== '0:00'
      },
      undefined,
      { timeout: 45_000 }
    )

    const currentTimeBeforeSeek = await player.currentTime.innerText()
    const duration = await page.getByTestId('duration').innerText()
    const fillWidth = await player.progressBarFill.evaluate(el =>
      window.getComputedStyle(el).getPropertyValue('width')
    )
    const containerWidth = await player.playbackProgress.evaluate(el => {
      const bar = el.querySelector('[data-testid="progress-bar-fill"]')?.parentElement
      return bar ? window.getComputedStyle(bar).getPropertyValue('width') : '0'
    })

    const currentSeconds = parseClock(currentTimeBeforeSeek)
    const durationSeconds = parseClock(duration)
    const fillPx = Number.parseFloat(fillWidth)
    const totalPx = Number.parseFloat(containerWidth)
    const barPct = totalPx > 0 ? (fillPx / totalPx) * 100 : 0
    const expectedPct = durationSeconds > 0 ? (currentSeconds / durationSeconds) * 100 : 0

    expect(durationSeconds).toBeGreaterThan(0)
    expect(Math.abs(barPct - expectedPct)).toBeLessThan(8)

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
