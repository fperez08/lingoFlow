import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import PlayerClient from '../PlayerClient'
import { Video } from '@/lib/videos'

jest.mock('@/hooks/useVocabulary', () => ({
  useVocabulary: () => ({ data: new Map(), isLoading: false }),
  useUpdateWordStatus: () => ({ mutate: jest.fn(), isPending: false }),
}))

const mockVideo: Video = {
  id: 'video-1',

  title: 'Test Lesson',
  author_name: 'Test Channel',
  thumbnail_url: 'https://example.com/thumb.jpg',
  transcript_path: 'transcripts/video-1.srt',
  transcript_format: 'srt',
  tags: ['french'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  source_type: 'local',
}

// Mock MiniPlayer to expose onTimeUpdate for testing.
// Variable MUST start with "mock" to satisfy babel-jest's hoisting rules for jest.mock factories.
let mockCapturedOnTimeUpdate: ((current: number, duration: number) => void) | undefined


jest.mock('@/components/LocalVideoPlayer', () => ({
  __esModule: true,
  default: ({ onClose, onTimeUpdate }: { onClose: () => void; onTimeUpdate?: (c: number, d: number) => void }) => {
    mockCapturedOnTimeUpdate = onTimeUpdate
    return (
      <div data-testid="mini-player">
        <button data-testid="mini-player-close" onClick={onClose}>Close</button>
      </div>
    )
  },
}))

beforeEach(() => {
  mockCapturedOnTimeUpdate = undefined
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('PlayerClient', () => {
  it('initially shows the lesson hero and not the mini-player', async () => {
    render(<PlayerClient video={mockVideo} cues={[]} />)
    expect(screen.getByTestId('lesson-hero')).toBeInTheDocument()
    expect(screen.queryByTestId('mini-player')).not.toBeInTheDocument()
  })

  it('shows mini-player after clicking play', async () => {
    render(<PlayerClient video={mockVideo} cues={[]} />)
    fireEvent.click(screen.getByTestId('play-button'))
    expect(screen.getByTestId('mini-player')).toBeInTheDocument()
  })

  it('hides mini-player after clicking close', async () => {
    render(<PlayerClient video={mockVideo} cues={[]} />)
    fireEvent.click(screen.getByTestId('play-button'))
    expect(screen.getByTestId('mini-player')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('mini-player-close'))
    expect(screen.queryByTestId('mini-player')).not.toBeInTheDocument()
  })

  it('still shows the lesson hero while mini-player is open', () => {
    render(<PlayerClient video={mockVideo} cues={[]} />)
    fireEvent.click(screen.getByTestId('play-button'))
    expect(screen.getByTestId('lesson-hero')).toBeInTheDocument()
    expect(screen.getByTestId('mini-player')).toBeInTheDocument()
  })

  it('renders the transcript panel', async () => {
    render(<PlayerClient video={mockVideo} cues={[]} />)
    expect(screen.getByText('Interactive Transcript')).toBeInTheDocument()
    expect(screen.queryByTestId('tab-vocabulary')).not.toBeInTheDocument()
  })

  it('uses provided cues and does not fetch transcript', () => {
    const cues = [
      { index: 1, startTime: '00:00:00,000', endTime: '00:00:02,000', text: 'Hello' },
    ]
    render(<PlayerClient video={mockVideo} cues={cues} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('fetches transcript when cues prop is not provided', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ cues: [] }),
    }) as jest.Mock
    render(<PlayerClient video={mockVideo} />)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/videos/video-1/transcript')
    })
  })

  it('does not render PlaybackProgress before play is clicked', () => {
    render(<PlayerClient video={mockVideo} cues={[]} />)
    expect(screen.queryByTestId('playback-progress')).not.toBeInTheDocument()
  })

  it('renders PlaybackProgress with 0 times after clicking play', () => {
    render(<PlayerClient video={mockVideo} cues={[]} />)
    fireEvent.click(screen.getByTestId('play-button'))
    expect(screen.getByTestId('playback-progress')).toBeInTheDocument()
    expect(screen.getByTestId('current-time')).toHaveTextContent('0:00')
  })

  it('updates PlaybackProgress when onTimeUpdate is called', () => {
    render(<PlayerClient video={mockVideo} cues={[]} />)
    fireEvent.click(screen.getByTestId('play-button'))

    act(() => {
      mockCapturedOnTimeUpdate?.(90, 300)
    })

    expect(screen.getByTestId('current-time')).toHaveTextContent('1:30')
    expect(screen.getByTestId('duration')).toHaveTextContent('5:00')
  })

  it('hides PlaybackProgress after closing the mini-player', () => {
    render(<PlayerClient video={mockVideo} cues={[]} />)
    fireEvent.click(screen.getByTestId('play-button'))

    act(() => {
      mockCapturedOnTimeUpdate?.(90, 300)
    })
    expect(screen.getByTestId('playback-progress')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('mini-player-close'))
    expect(screen.queryByTestId('playback-progress')).not.toBeInTheDocument()
  })

  it('renders mini-player for local video source_type', async () => {
    const localVideo: Video = {
      ...mockVideo,
      source_type: 'local',
      local_video_path: 'videos/test.mp4',
      local_video_filename: 'test.mp4',
    }
    render(<PlayerClient video={localVideo} cues={[]} />)
    fireEvent.click(screen.getByTestId('play-button'))
    expect(screen.getByTestId('mini-player')).toBeInTheDocument()
  })
})

