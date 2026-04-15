import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PlayerClient from '../PlayerClient'
import { Video } from '@/lib/videos'

const mockVideo: Video = {
  id: 'video-1',
  youtube_url: 'https://www.youtube.com/watch?v=abc123',
  youtube_id: 'abc123',
  title: 'Test Lesson',
  author_name: 'Test Channel',
  thumbnail_url: 'https://example.com/thumb.jpg',
  transcript_path: 'transcripts/video-1.srt',
  transcript_format: 'srt',
  tags: ['french'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ cues: [] }),
  }) as jest.Mock
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('PlayerClient', () => {
  it('initially shows the lesson hero and not the mini-player', async () => {
    render(<PlayerClient video={mockVideo} />)
    expect(screen.getByTestId('lesson-hero')).toBeInTheDocument()
    expect(screen.queryByTestId('mini-player')).not.toBeInTheDocument()
  })

  it('shows mini-player after clicking play', async () => {
    render(<PlayerClient video={mockVideo} />)
    fireEvent.click(screen.getByTestId('play-button'))
    expect(screen.getByTestId('mini-player')).toBeInTheDocument()
  })

  it('hides mini-player after clicking close', async () => {
    render(<PlayerClient video={mockVideo} />)
    fireEvent.click(screen.getByTestId('play-button'))
    expect(screen.getByTestId('mini-player')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('mini-player-close'))
    expect(screen.queryByTestId('mini-player')).not.toBeInTheDocument()
  })

  it('still shows the lesson hero while mini-player is open', () => {
    render(<PlayerClient video={mockVideo} />)
    fireEvent.click(screen.getByTestId('play-button'))
    expect(screen.getByTestId('lesson-hero')).toBeInTheDocument()
    expect(screen.getByTestId('mini-player')).toBeInTheDocument()
  })

  it('renders the transcript tab area', async () => {
    render(<PlayerClient video={mockVideo} />)
    expect(screen.getByTestId('tab-transcript')).toBeInTheDocument()
    expect(screen.getByTestId('tab-vocabulary')).toBeInTheDocument()
  })

  it('fetches transcript on mount', async () => {
    render(<PlayerClient video={mockVideo} />)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/videos/video-1/transcript')
    })
  })
})
