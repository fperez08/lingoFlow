'use client'

import { useRef } from 'react'

interface MiniPlayerProps {
  youtubeId: string
  title: string
  onClose: () => void
}

export default function MiniPlayer({ youtubeId, title, onClose }: MiniPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  function handleClose() {
    iframeRef.current?.contentWindow?.postMessage(
      '{"event":"command","func":"pauseVideo","args":""}',
      '*'
    )
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
