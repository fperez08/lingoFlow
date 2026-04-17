import { render, screen, fireEvent, act } from '@testing-library/react'
import MiniPlayer from '../MiniPlayer'

let capturedOnStateChange: ((event: { data: number }) => void) | null = null
let mockIframe: HTMLIFrameElement

const mockGetCurrentTime = jest.fn().mockReturnValue(90)
const mockGetDuration = jest.fn().mockReturnValue(300)
const mockSeekTo = jest.fn()
const mockDestroy = jest.fn()
const mockPauseVideo = jest.fn()
const mockPlayVideo = jest.fn()

beforeEach(() => {
  jest.useFakeTimers()
  capturedOnStateChange = null
  mockIframe = document.createElement('iframe')
  mockGetCurrentTime.mockReturnValue(90)
  mockGetDuration.mockReturnValue(300)
  mockSeekTo.mockReset()
  mockDestroy.mockReset()
  mockPauseVideo.mockReset()
  mockPlayVideo.mockReset()

  Object.defineProperty(window, 'YT', {
    value: {
      Player: jest.fn().mockImplementation(
        (
          _el: unknown,
          opts: {
            events: { onReady?: (event: YT.PlayerEvent) => void; onStateChange: (e: { data: number }) => void }
          }
        ) => {
          capturedOnStateChange = opts.events.onStateChange
          opts.events.onReady?.(
            {
              target: {
                getIframe: () => mockIframe,
                playVideo: mockPlayVideo,
              },
            } as unknown as YT.PlayerEvent
          )
          return {
            getCurrentTime: mockGetCurrentTime,
            getDuration: mockGetDuration,
            seekTo: mockSeekTo,
            destroy: mockDestroy,
            pauseVideo: mockPauseVideo,
            playVideo: mockPlayVideo,
            getIframe: () => mockIframe,
          }
        }
      ),
      PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0, BUFFERING: 3, CUED: 5 },
    },
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  jest.useRealTimers()
  jest.resetAllMocks()
})

describe('MiniPlayer', () => {
  it('initializes YT player with video id and player vars', () => {
    render(<MiniPlayer youtubeId="abc123" title="My Video" onClose={jest.fn()} />)
    expect(window.YT.Player).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        videoId: 'abc123',
        playerVars: expect.objectContaining({
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
        }),
      })
    )
  })

  it('sets iframe attributes on player ready', () => {
    render(<MiniPlayer youtubeId="abc123" title="My Video" onClose={jest.fn()} />)
    expect(mockIframe).toHaveAttribute('title', 'My Video')
    expect(mockIframe).toHaveAttribute('data-testid', 'mini-player-iframe')
    expect(mockPlayVideo).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn()
    render(<MiniPlayer youtubeId="abc123" title="My Video" onClose={onClose} />)
    fireEvent.click(screen.getByTestId('mini-player-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders the close button with accessible label', () => {
    render(<MiniPlayer youtubeId="abc123" title="My Video" onClose={jest.fn()} />)
    expect(screen.getByLabelText('Close mini player')).toBeInTheDocument()
  })

  it('has the mini-player data-testid', () => {
    render(<MiniPlayer youtubeId="abc123" title="My Video" onClose={jest.fn()} />)
    expect(screen.getByTestId('mini-player')).toBeInTheDocument()
  })

  it('calls onTimeUpdate with current time and duration when polling', () => {
    const onTimeUpdate = jest.fn()
    render(
      <MiniPlayer youtubeId="abc123" title="My Video" onClose={jest.fn()} onTimeUpdate={onTimeUpdate} />
    )

    // Simulate PLAYING state to start polling
    act(() => {
      capturedOnStateChange?.({ data: 1 }) // PLAYING
    })

    act(() => {
      jest.advanceTimersByTime(250)
    })

    expect(onTimeUpdate).toHaveBeenCalledWith(90, 300)
  })

  it('stops polling when state changes to PAUSED', () => {
    const onTimeUpdate = jest.fn()
    render(
      <MiniPlayer youtubeId="abc123" title="My Video" onClose={jest.fn()} onTimeUpdate={onTimeUpdate} />
    )

    act(() => {
      capturedOnStateChange?.({ data: 1 }) // PLAYING
    })
    act(() => {
      jest.advanceTimersByTime(250)
    })
    expect(onTimeUpdate).toHaveBeenCalledTimes(1)

    act(() => {
      capturedOnStateChange?.({ data: 2 }) // PAUSED
    })
    act(() => {
      jest.advanceTimersByTime(500)
    })
    // No additional calls after pause
    expect(onTimeUpdate).toHaveBeenCalledTimes(1)
  })

  it('clears the interval on unmount', () => {
    const onTimeUpdate = jest.fn()
    const { unmount } = render(
      <MiniPlayer youtubeId="abc123" title="My Video" onClose={jest.fn()} onTimeUpdate={onTimeUpdate} />
    )

    act(() => {
      capturedOnStateChange?.({ data: 1 }) // PLAYING
    })

    unmount()

    act(() => {
      jest.advanceTimersByTime(500)
    })
    // No calls after unmount
    expect(onTimeUpdate).not.toHaveBeenCalled()
  })

  it('seeks when seekToTime is provided', () => {
    const onSeekApplied = jest.fn()
    render(
      <MiniPlayer
        youtubeId="abc123"
        title="My Video"
        onClose={jest.fn()}
        seekToTime={42}
        onSeekApplied={onSeekApplied}
      />
    )

    expect(mockSeekTo).toHaveBeenCalledWith(42, true)
    expect(onSeekApplied).toHaveBeenCalledTimes(1)
  })
})
