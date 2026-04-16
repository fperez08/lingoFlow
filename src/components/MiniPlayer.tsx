'use client'

import { useEffect, useRef } from 'react'

interface MiniPlayerProps {
  youtubeId: string
  title: string
  onClose: () => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  seekToTime?: number | null
  onSeekApplied?: () => void
}

export default function MiniPlayer({
  youtubeId,
  title,
  onClose,
  onTimeUpdate,
  seekToTime,
  onSeekApplied,
}: MiniPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  onTimeUpdateRef.current = onTimeUpdate

  useEffect(() => {
    let destroyed = false

    function startPolling(player: YT.Player) {
      if (pollIntervalRef.current) return
      pollIntervalRef.current = setInterval(() => {
        if (destroyed) return
        const current = player.getCurrentTime()
        const total = player.getDuration()
        if (total > 0) onTimeUpdateRef.current?.(current, total)
      }, 250)
    }

    function stopPolling() {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }

    function initPlayer() {
      if (!iframeRef.current) return
      const player = new window.YT.Player(iframeRef.current, {
        events: {
          onStateChange(event: YT.OnStateChangeEvent) {
            if (event.data === window.YT.PlayerState.PLAYING) {
              startPolling(player)
            } else {
              stopPolling()
              if (event.data === window.YT.PlayerState.ENDED) {
                const total = player.getDuration()
                if (total > 0) onTimeUpdateRef.current?.(total, total)
              }
            }
          },
        },
      })
      playerRef.current = player
    }

    if (window.YT?.Player) {
      initPlayer()
    } else {
      const prevReady = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prevReady?.()
        if (!destroyed) initPlayer()
      }
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement('script')
        script.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(script)
      }
    }

    return () => {
      destroyed = true
      stopPolling()
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [youtubeId])

  useEffect(() => {
    if (seekToTime == null || !playerRef.current) return
    playerRef.current.seekTo(seekToTime, true)
    onSeekApplied?.()
  }, [onSeekApplied, seekToTime])

  function handleClose() {
    playerRef.current?.pauseVideo()
    onClose()
  }

  return (
    <div
      data-testid="mini-player"
      className="fixed bottom-4 right-4 z-50 w-80 aspect-video shadow-2xl rounded-xl overflow-hidden bg-black"
    >
      <iframe
        ref={iframeRef}
        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1`}
        className="w-full h-full"
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        title={title}
        data-testid="mini-player-iframe"
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
