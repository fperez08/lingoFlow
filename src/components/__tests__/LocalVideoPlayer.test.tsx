/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, act } from '@testing-library/react'
import LocalVideoPlayer from '../LocalVideoPlayer'

// Minimal HTMLVideoElement mock
function setupVideoMock() {
  const mockEl = {
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn(),
    currentTime: 0,
    duration: 120,
    paused: false,
    playbackRate: 1,
  }
  Object.defineProperty(window.HTMLVideoElement.prototype, 'play', {
    configurable: true,
    writable: true,
    value: mockEl.play,
  })
  Object.defineProperty(window.HTMLVideoElement.prototype, 'pause', {
    configurable: true,
    writable: true,
    value: mockEl.pause,
  })
  return mockEl
}

const defaultProps = {
  videoId: 'vid-1',
  title: 'Test Video',
  onClose: jest.fn(),
}

describe('LocalVideoPlayer', () => {
  beforeEach(() => {
    setupVideoMock()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders the video element and close button', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    expect(screen.getByTestId('local-video')).toBeInTheDocument()
    expect(screen.getByTestId('mini-player-close')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn()
    render(<LocalVideoPlayer {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('mini-player-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders play/pause, rewind, and fast-forward buttons', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    expect(screen.getByTestId('mini-player-play-pause')).toBeInTheDocument()
    expect(screen.getByTestId('rewind-button')).toBeInTheDocument()
    expect(screen.getByTestId('fastforward-button')).toBeInTheDocument()
  })

  it('renders speed selector with all speed options', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    const select = screen.getByTestId('mini-player-speed') as HTMLSelectElement
    expect(select).toBeInTheDocument()
    const options = Array.from(select.options).map((o) => parseFloat(o.value))
    expect(options).toEqual([0.5, 0.75, 1, 1.25, 1.5, 2])
  })

  it('default speed is 1', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    const select = screen.getByTestId('mini-player-speed') as HTMLSelectElement
    expect(select.value).toBe('1')
  })

  it('changes speed when select changes', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    const select = screen.getByTestId('mini-player-speed') as HTMLSelectElement
    fireEvent.change(select, { target: { value: '1.5' } })
    expect(select.value).toBe('1.5')
  })

  it('play/pause button toggles aria-label on pause event', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    const btn = screen.getByTestId('mini-player-play-pause')
    // Initially autoPlay → isPlaying = true → label is "Pause"
    expect(btn).toHaveAttribute('aria-label', 'Pause')

    // Simulate browser pause event on video
    const video = screen.getByTestId('local-video')
    act(() => { fireEvent.pause(video) })
    expect(btn).toHaveAttribute('aria-label', 'Play')
  })

  it('play/pause button toggles aria-label back on play event', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    const btn = screen.getByTestId('mini-player-play-pause')
    const video = screen.getByTestId('local-video')
    act(() => { fireEvent.pause(video) })
    expect(btn).toHaveAttribute('aria-label', 'Play')
    act(() => { fireEvent.play(video) })
    expect(btn).toHaveAttribute('aria-label', 'Pause')
  })

  it('applies seekToTime when prop changes', () => {
    const { rerender } = render(<LocalVideoPlayer {...defaultProps} seekToTime={null} />)
    const video = screen.getByTestId('local-video') as HTMLVideoElement
    const onSeekApplied = jest.fn()
    rerender(<LocalVideoPlayer {...defaultProps} seekToTime={30} onSeekApplied={onSeekApplied} />)
    expect(video.currentTime).toBe(30)
    expect(onSeekApplied).toHaveBeenCalledTimes(1)
  })

  it('calls onTimeUpdate via polling on play event', () => {
    jest.useFakeTimers()
    const onTimeUpdate = jest.fn()
    render(<LocalVideoPlayer {...defaultProps} onTimeUpdate={onTimeUpdate} />)
    const video = screen.getByTestId('local-video') as HTMLVideoElement
    Object.defineProperty(video, 'duration', { configurable: true, value: 120 })
    Object.defineProperty(video, 'currentTime', { configurable: true, value: 5 })

    act(() => { fireEvent.play(video) })
    act(() => { jest.advanceTimersByTime(300) })
    expect(onTimeUpdate).toHaveBeenCalled()

    jest.useRealTimers()
  })
})

describe('LocalVideoPlayer seek behavior', () => {
  beforeEach(() => {
    setupVideoMock()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('rewind button seeks backward by 10 seconds', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    const video = screen.getByTestId('local-video') as HTMLVideoElement
    Object.defineProperty(video, 'duration', { configurable: true, value: 120 })
    video.currentTime = 30
    fireEvent.click(screen.getByTestId('rewind-button'))
    expect(video.currentTime).toBe(20)
  })

  it('rewind clamps to 0 when currentTime is less than seek interval', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    const video = screen.getByTestId('local-video') as HTMLVideoElement
    Object.defineProperty(video, 'duration', { configurable: true, value: 120 })
    video.currentTime = 5
    fireEvent.click(screen.getByTestId('rewind-button'))
    expect(video.currentTime).toBe(0)
  })

  it('fast-forward button seeks forward by 10 seconds', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    const video = screen.getByTestId('local-video') as HTMLVideoElement
    Object.defineProperty(video, 'duration', { configurable: true, value: 120 })
    video.currentTime = 30
    fireEvent.click(screen.getByTestId('fastforward-button'))
    expect(video.currentTime).toBe(40)
  })

  it('fast-forward clamps to duration when near end', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    const video = screen.getByTestId('local-video') as HTMLVideoElement
    Object.defineProperty(video, 'duration', { configurable: true, value: 120 })
    video.currentTime = 115
    fireEvent.click(screen.getByTestId('fastforward-button'))
    expect(video.currentTime).toBe(120)
  })
})

describe('LocalVideoPlayer seek controls accessibility', () => {
  beforeEach(() => {
    setupVideoMock()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('rewind button has accessible name "Rewind 10 seconds"', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Rewind 10 seconds' })).toBeInTheDocument()
  })

  it('fast-forward button has accessible name "Fast-forward 10 seconds"', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Fast-forward 10 seconds' })).toBeInTheDocument()
  })

  it('rewind and fast-forward buttons have different aria-labels', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    const rewind = screen.getByTestId('rewind-button')
    const fastforward = screen.getByTestId('fastforward-button')
    expect(rewind.getAttribute('aria-label')).not.toBe(fastforward.getAttribute('aria-label'))
  })

  it('both seek controls are keyboard-operable buttons', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Rewind 10 seconds' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fast-forward 10 seconds' })).toBeInTheDocument()
  })

  it('rewind button has data-testid "rewind-button"', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    expect(screen.getByTestId('rewind-button')).toBeInTheDocument()
  })

  it('fast-forward button has data-testid "fastforward-button"', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    expect(screen.getByTestId('fastforward-button')).toBeInTheDocument()
  })
})

describe('LocalVideoPlayer sidebar-aware positioning', () => {
  beforeEach(() => {
    setupVideoMock()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('uses default right-4 position when sidebarOpen is false', () => {
    render(<LocalVideoPlayer {...defaultProps} isSidebarOpen={false} />)
    const miniPlayer = screen.getByTestId('mini-player')
    expect(miniPlayer.className).toContain('right-4')
    expect(miniPlayer.className).not.toContain('right-[21rem]')
  })

  it('uses default right-4 position when sidebarOpen is not provided', () => {
    render(<LocalVideoPlayer {...defaultProps} />)
    const miniPlayer = screen.getByTestId('mini-player')
    expect(miniPlayer.className).toContain('right-4')
    expect(miniPlayer.className).not.toContain('right-[21rem]')
  })

  it('shifts to right-[21rem] when sidebarOpen is true', () => {
    render(<LocalVideoPlayer {...defaultProps} isSidebarOpen={true} />)
    const miniPlayer = screen.getByTestId('mini-player')
    expect(miniPlayer.className).toContain('right-[21rem]')
    expect(miniPlayer.className).not.toContain('right-4')
  })

  it('remains visible (in the DOM) when sidebarOpen is true', () => {
    render(<LocalVideoPlayer {...defaultProps} isSidebarOpen={true} />)
    expect(screen.getByTestId('mini-player')).toBeInTheDocument()
  })

  it('controls remain accessible when sidebarOpen is true', () => {
    render(<LocalVideoPlayer {...defaultProps} isSidebarOpen={true} />)
    expect(screen.getByTestId('mini-player-play-pause')).toBeInTheDocument()
    expect(screen.getByTestId('rewind-button')).toBeInTheDocument()
    expect(screen.getByTestId('fastforward-button')).toBeInTheDocument()
    expect(screen.getByTestId('mini-player-close')).toBeInTheDocument()
  })
})
