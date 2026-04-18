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
    expect(screen.getByTestId('mini-player-rewind')).toBeInTheDocument()
    expect(screen.getByTestId('mini-player-fastforward')).toBeInTheDocument()
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
