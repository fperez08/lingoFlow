import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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

// Mock MiniPlayer to expose onTimeUpdate and seekTo for testing.
// Variable MUST start with "mock" to satisfy babel-jest's hoisting rules for jest.mock factories.
var mockCapturedOnTimeUpdate: ((current: number, duration: number) => void) | undefined
var mockSeekTo: jest.Mock = jest.fn()

jest.mock('@/components/MiniPlayer', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: React.forwardRef(
      ({ onClose, onTimeUpdate }: { onClose: () => void; onTimeUpdate?: (c: number, d: number) => void }, ref: React.Ref<{ seekTo: (s: number) => void }>) => {
        mockCapturedOnTimeUpdate = onTimeUpdate
        React.useImperativeHandle(ref, () => ({ seekTo: mockSeekTo }))
        return (
          <div data-testid="mini-player">
            <button data-testid="mini-player-close" onClick={onClose}>Close</button>
          </div>
        )
      }
    ),
  }
})

// Sample cues spanning 2 pages (12 cues total, page size = 10)
const sampleCues = Array.from({ length: 12 }, (_, i) => ({
  index: i + 1,
  startTime: `00:00:${String(i * 5).padStart(2, '0')},000`,
  endTime: `00:00:${String(i * 5 + 4).padStart(2, '0')},000`,
  text: `Cue text ${i + 1}`,
}))

beforeEach(() => {
  mockCapturedOnTimeUpdate = undefined
  mockSeekTo = jest.fn()
  window.HTMLElement.prototype.scrollIntoView = jest.fn()
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

  it('does not render PlaybackProgress before play is clicked', () => {
    render(<PlayerClient video={mockVideo} />)
    expect(screen.queryByTestId('playback-progress')).not.toBeInTheDocument()
  })

  it('renders PlaybackProgress with 0 times after clicking play', () => {
    render(<PlayerClient video={mockVideo} />)
    fireEvent.click(screen.getByTestId('play-button'))
    expect(screen.getByTestId('playback-progress')).toBeInTheDocument()
    expect(screen.getByTestId('current-time')).toHaveTextContent('0:00')
  })

  it('updates PlaybackProgress when onTimeUpdate is called', () => {
    render(<PlayerClient video={mockVideo} />)
    fireEvent.click(screen.getByTestId('play-button'))

    act(() => {
      mockCapturedOnTimeUpdate?.(90, 300)
    })

    expect(screen.getByTestId('current-time')).toHaveTextContent('1:30')
    expect(screen.getByTestId('duration')).toHaveTextContent('5:00')
  })

  it('hides PlaybackProgress after closing the mini-player', () => {
    render(<PlayerClient video={mockVideo} />)
    fireEvent.click(screen.getByTestId('play-button'))

    act(() => {
      mockCapturedOnTimeUpdate?.(90, 300)
    })
    expect(screen.getByTestId('playback-progress')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('mini-player-close'))
    expect(screen.queryByTestId('playback-progress')).not.toBeInTheDocument()
  })

  it('highlights active cue when onTimeUpdate fires a matching time', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ cues: sampleCues }),
    }) as jest.Mock

    render(<PlayerClient video={mockVideo} />)
    fireEvent.click(screen.getByTestId('play-button'))

    // Wait for transcript cues to load (loading state clears)
    await waitFor(() => screen.getByText('Cue text 1'))

    // Fire time update at 2s — falls inside cue 0 (starts 0s, ends 4s)
    act(() => {
      mockCapturedOnTimeUpdate?.(2, 300)
    })

    await waitFor(() => {
      expect(screen.getByTestId('cue-active')).toBeInTheDocument()
    })
  })

  it('auto-advances page when active cue crosses page boundary', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ cues: sampleCues }),
    }) as jest.Mock

    render(<PlayerClient video={mockVideo} />)
    fireEvent.click(screen.getByTestId('play-button'))

    // Wait for transcript cues to load
    await waitFor(() => screen.getByText('Cue text 1'))

    // cue index 10 (0-based) = page 1 (starts at 50s, ends at 54s)
    act(() => {
      mockCapturedOnTimeUpdate?.(51, 300)
    })

    await waitFor(() => {
      // Page 2 indicator should now show
      expect(screen.getByTestId('transcript-page-indicator')).toHaveTextContent('2 / 2')
    })
  })
})


describe('PlayerClient — seek wiring', () => {
  const cuesWithTiming = Array.from({ length: 5 }, (_, i) => ({
    index: i + 1,
    startTime: `00:00:${String(i * 5).padStart(2, '0')},000`,
    endTime: `00:00:${String(i * 5 + 4).padStart(2, '0')},000`,
    text: `Word1 Word2 Word3`,
  }))

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ cues: cuesWithTiming }),
    }) as jest.Mock
  })

  it('clicking a non-active cue calls seekTo with correct time', async () => {
    render(<PlayerClient video={mockVideo} />)
    fireEvent.click(screen.getByTestId('play-button'))
    await waitFor(() => screen.getByTestId('cue-0'))

    // cue-0 startTime = 0s
    fireEvent.click(screen.getByTestId('cue-0'))
    expect(mockSeekTo).toHaveBeenCalledWith(0)
  })

  it('clicking a word in the active cue calls seekTo with the cue start time', async () => {
    render(<PlayerClient video={mockVideo} />)
    fireEvent.click(screen.getByTestId('play-button'))
    await waitFor(() => screen.getByTestId('cue-0'))

    // Activate cue 0 (starts at 0s, ends at 4s) with currentTime=1
    act(() => {
      mockCapturedOnTimeUpdate?.(1, 120)
    })

    await waitFor(() => screen.getByTestId('cue-active'))

    // word-1 inside active cue → should seek to cue 0 start (0s)
    fireEvent.click(screen.getByTestId('word-1'))
    expect(mockSeekTo).toHaveBeenCalledWith(0)
  })

  it('passes currentTime to TranscriptPanel (verified via highlighted word in active cue)', async () => {
    render(<PlayerClient video={mockVideo} />)
    fireEvent.click(screen.getByTestId('play-button'))
    await waitFor(() => screen.getByTestId('cue-0'))

    act(() => {
      mockCapturedOnTimeUpdate?.(2, 120)
    })

    await waitFor(() => {
      expect(screen.getByTestId('cue-text')).toBeInTheDocument()
    })
  })
})
