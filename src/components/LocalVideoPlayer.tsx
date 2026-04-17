'use client'

import { useEffect, useRef } from 'react'

interface LocalVideoPlayerProps {
  videoId: string
  title: string
  onClose: () => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  seekToTime?: number | null
  onSeekApplied?: () => void
}

export default function LocalVideoPlayer({
  videoId,
  title,
  onClose,
  onTimeUpdate,
  seekToTime,
  onSeekApplied,
}: LocalVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  return (
    <div
      data-testid="mini-player"
      className="fixed bottom-4 right-4 z-50 w-80 aspect-video shadow-2xl rounded-xl overflow-hidden bg-black md:bottom-auto md:top-20"
    >
      <video
        ref={videoRef}
        src={`/api/videos/${videoId}/stream`}
        title={title}
        data-testid="local-video"
        className="w-full h-full"
        autoPlay
        onPlay={startPolling}
        onPause={stopPolling}
        onEnded={() => {
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
  )
}
