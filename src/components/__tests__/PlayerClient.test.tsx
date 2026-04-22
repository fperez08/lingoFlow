import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import PlayerClient from '../PlayerClient'
import { Video } from '@/lib/videos'

let mockVocabMapData = new Map()

jest.mock('@/hooks/useVocabulary', () => ({
  useVocabulary: () => ({ data: mockVocabMapData, isLoading: false }),
  useUpdateWordStatus: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateWordDefinition: () => ({ mutateAsync: jest.fn(), isPending: false }),
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

// Mock LocalVideoPlayer to expose onTimeUpdate and isSidebarOpen for testing.
// Variable MUST start with "mock" to satisfy babel-jest's hoisting rules for jest.mock factories.
let mockCapturedOnTimeUpdate: ((current: number, duration: number) => void) | undefined
let mockCapturedIsSidebarOpen: boolean | undefined

jest.mock('@/components/LocalVideoPlayer', () => ({
  __esModule: true,
  default: ({ onClose, onTimeUpdate, isSidebarOpen }: { onClose: () => void; onTimeUpdate?: (c: number, d: number) => void; isSidebarOpen?: boolean }) => {
    mockCapturedOnTimeUpdate = onTimeUpdate
    mockCapturedIsSidebarOpen = isSidebarOpen
    return (
      <div data-testid="mini-player">
        <button data-testid="mini-player-close" onClick={onClose}>Close</button>
      </div>
    )
  },
}))

beforeEach(() => {
  mockCapturedOnTimeUpdate = undefined
  mockCapturedIsSidebarOpen = undefined
  mockVocabMapData = new Map()
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

  it('passes isSidebarOpen=false to mini-player when no word is selected', () => {
    render(<PlayerClient video={mockVideo} cues={[]} />)
    fireEvent.click(screen.getByTestId('play-button'))
    expect(mockCapturedIsSidebarOpen).toBe(false)
  })

  it('passes isSidebarOpen=true to mini-player when a word is selected', () => {
    const cues = [
      { index: 1, startTime: '00:00:00,000', endTime: '00:00:02,000', text: 'Hello' },
    ]
    render(<PlayerClient video={mockVideo} cues={cues} />)
    fireEvent.click(screen.getByTestId('play-button'))
    // Click the word to open the sidebar
    fireEvent.click(screen.getByTestId('word-hello'))
    expect(mockCapturedIsSidebarOpen).toBe(true)
  })

  it('renders transcript words with highlighting when vocabMap is provided', () => {
    const cues = [
      { index: 1, startTime: '00:00:00,000', endTime: '00:00:02,000', text: 'Hello world' },
    ]
    mockVocabMapData = new Map([
      ['hello', { word: 'hello', status: 'mastered' as const, level: 'A1', definition: 'greeting' }],
      ['world', { word: 'world', status: 'learning' as const, level: 'A2', definition: 'earth' }],
    ])

    render(<PlayerClient video={mockVideo} cues={cues} />)

    // Verify words are rendered
    const helloWord = screen.getByTestId('word-hello')
    const worldWord = screen.getByTestId('word-world')
    expect(helloWord).toBeInTheDocument()
    expect(worldWord).toBeInTheDocument()

    // Verify mastered word has green styling
    expect(helloWord).toHaveClass('text-green-600')
    expect(helloWord).toHaveClass('bg-green-50')

    // Verify learning word has yellow styling
    expect(worldWord).toHaveClass('text-yellow-600')
    expect(worldWord).toHaveClass('bg-yellow-50')
  })

  it('updates transcript word highlighting when vocabMap is refreshed', async () => {
    const cues = [
      { index: 1, startTime: '00:00:00,000', endTime: '00:00:02,000', text: 'Hello world' },
    ]
    mockVocabMapData = new Map([
      ['hello', { word: 'hello', status: 'new' as const, level: 'A1', definition: 'greeting' }],
      ['world', { word: 'world', status: 'new' as const, level: 'A2', definition: 'earth' }],
    ])

    const { rerender } = render(<PlayerClient video={mockVideo} cues={cues} />)

    // Initially, words should NOT have mastered/learning styles (status is 'new')
    const helloWord = screen.getByTestId('word-hello')
    expect(helloWord).not.toHaveClass('text-green-600')
    expect(helloWord).not.toHaveClass('text-yellow-600')

    // Update vocabMap to indicate 'hello' is now mastered
    mockVocabMapData = new Map([
      ['hello', { word: 'hello', status: 'mastered' as const, level: 'A1', definition: 'greeting' }],
      ['world', { word: 'world', status: 'new' as const, level: 'A2', definition: 'earth' }],
    ])

    rerender(<PlayerClient video={mockVideo} cues={cues} />)

    // After vocab refresh, 'hello' should have mastered styling
    const updatedHelloWord = screen.getByTestId('word-hello')
    expect(updatedHelloWord).toHaveClass('text-green-600')
    expect(updatedHelloWord).toHaveClass('bg-green-50')

    // 'world' should still not have special styling
    const worldWord = screen.getByTestId('word-world')
    expect(worldWord).not.toHaveClass('text-green-600')
  })
})


