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
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const configureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let destroyed = false
    const prevReady = window.onYouTubeIframeAPIReady

    function startPolling(player: YT.Player) {
      if (pollIntervalRef.current) return
      pollIntervalRef.current = setInterval(() => {
        if (destroyed) return
        const current = player.getCurrentTime()
        const total = player.getDuration()
        if (total > 0) onTimeUpdate?.(current, total)
      }, 250)
    }

    function stopPolling() {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }

    function stopConfigureRetry() {
      if (configureIntervalRef.current) {
        clearInterval(configureIntervalRef.current)
        configureIntervalRef.current = null
      }
    }

    function configureIframe(player: YT.Player) {
      const iframe = player.getIframe()
      iframe.className = 'w-full h-full'
      iframe.setAttribute('title', title)
      iframe.setAttribute('data-testid', 'mini-player-iframe')
    }

    function tryConfigureIframe(player: YT.Player): boolean {
      try {
        configureIframe(player)
        return true
      } catch {
        return false
      }
    }

    function initPlayer() {
      if (!containerRef.current) return

      const player = new window.YT.Player(containerRef.current, {
        videoId: youtubeId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady(event: YT.PlayerEvent) {
            configureIframe(event.target)
            event.target.playVideo()
            startPolling(event.target)
          },
          onStateChange(event: YT.OnStateChangeEvent) {
            if (event.data === window.YT.PlayerState.PLAYING) {
              startPolling(player)
            } else {
              stopPolling()
              if (event.data === window.YT.PlayerState.ENDED) {
                const total = player.getDuration()
                if (total > 0) onTimeUpdate?.(total, total)
              }
            }
          },
        },
      })
      playerRef.current = player

      if (!tryConfigureIframe(player)) {
        configureIntervalRef.current = setInterval(() => {
          if (destroyed) return
          if (tryConfigureIframe(player)) {
            stopConfigureRetry()
          }
        }, 200)
      }
    }

    if (window.YT?.Player) {
      initPlayer()
    } else {
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
      window.onYouTubeIframeAPIReady = prevReady
      stopPolling()
      stopConfigureRetry()
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [onTimeUpdate, title, youtubeId])

  useEffect(() => {
    const player = playerRef.current
    if (seekToTime == null || !player || typeof player.seekTo !== 'function') return
    player.seekTo(seekToTime, true)
    onSeekApplied?.()
  }, [onSeekApplied, seekToTime])

  function handleClose() {
    const player = playerRef.current
    if (player && typeof player.pauseVideo === 'function') {
      player.pauseVideo()
    }
    onClose()
  }

  return (
    <div
      data-testid="mini-player"
      className="fixed bottom-4 right-4 z-50 w-80 aspect-video shadow-2xl rounded-xl overflow-hidden bg-black md:bottom-auto md:top-20"
    >
      <div ref={containerRef} className="w-full h-full" />
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
