'use client'

import { useEffect, useRef, useState } from 'react'

const SEEK_INTERVAL = 10
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const
type SpeedOption = (typeof SPEED_OPTIONS)[number]

interface LocalVideoPlayerProps {
  videoId: string
  title: string
  onClose: () => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  seekToTime?: number | null
  onSeekApplied?: () => void
  isSidebarOpen?: boolean
}

export default function LocalVideoPlayer({
  videoId,
  title,
  onClose,
  onTimeUpdate,
  seekToTime,
  onSeekApplied,
  isSidebarOpen = false,
}: LocalVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [speed, setSpeed] = useState<SpeedOption>(1)

  function startPolling() {
    if (pollIntervalRef.current) return
    pollIntervalRef.current = setInterval(() => {
      const el = videoRef.current
      if (el && el.duration > 0) {
        onTimeUpdate?.(el.currentTime, el.duration)
      }
    }, 250)
  }

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  useEffect(() => {
    return () => stopPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = videoRef.current
    if (seekToTime == null || !el) return
    el.currentTime = seekToTime
    onSeekApplied?.()
  }, [seekToTime, onSeekApplied])

  function handleClose() {
    videoRef.current?.pause()
    onClose()
  }

  function handlePlayPause() {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      el.play()
    } else {
      el.pause()
    }
  }

  function handleRewind() {
    const el = videoRef.current
    if (!el) return
    el.currentTime = Math.max(0, el.currentTime - SEEK_INTERVAL)
  }

  function handleFastForward() {
    const el = videoRef.current
    if (!el) return
    el.currentTime = Math.min(el.duration || 0, el.currentTime + SEEK_INTERVAL)
  }

  function handleSpeedChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = parseFloat(e.target.value) as SpeedOption
    setSpeed(val)
    if (videoRef.current) {
      videoRef.current.playbackRate = val
    }
  }

  return (
    <div
      data-testid="mini-player"
      className={`fixed bottom-4 ${isSidebarOpen ? 'right-[21rem]' : 'right-4'} z-50 w-80 shadow-2xl rounded-xl overflow-hidden bg-black md:bottom-auto md:top-20`}
    >
      <div className="relative aspect-video">
        <video
          ref={videoRef}
          src={`/api/videos/${videoId}/stream`}
          title={title}
          data-testid="local-video"
          className="w-full h-full"
          autoPlay
          onPlay={() => { setIsPlaying(true); startPolling() }}
          onPause={() => { setIsPlaying(false); stopPolling() }}
          onEnded={() => {
            setIsPlaying(false)
            stopPolling()
            const el = videoRef.current
            if (el) onTimeUpdate?.(el.duration, el.duration)
          }}
        />
        <button
          onClick={handleClose}
          aria-label="Close mini player"
          data-testid="mini-player-close"
          className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white text-sm transition"
        >
          ✕
        </button>
      </div>

      {/* Transport controls */}
      <div className="flex items-center justify-between gap-1 px-3 py-2 bg-gray-900">
        <button
          onClick={handleRewind}
          aria-label="Rewind 10 seconds"
          data-testid="rewind-button"
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 text-white transition"
        >
          {/* Double left-chevron — clearly distinct from forward */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
            <path d="M18 6l-6 6 6 6V6zM11 6l-6 6 6 6V6z"/>
          </svg>
        </button>

        <button
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          data-testid="mini-player-play-pause"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        <button
          onClick={handleFastForward}
          aria-label="Fast-forward 10 seconds"
          data-testid="fastforward-button"
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 text-white transition"
        >
          {/* Double right-chevron — clearly distinct from rewind */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
            <path d="M6 18l6-6-6-6v12zM13 18l6-6-6-6v12z"/>
          </svg>
        </button>

        <select
          value={speed}
          onChange={handleSpeedChange}
          aria-label="Playback speed"
          data-testid="mini-player-speed"
          className="ml-auto text-white bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-white/30"
        >
          {SPEED_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
