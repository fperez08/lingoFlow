'use client'

import { useEffect, useState } from 'react'
import { Video } from '@/lib/videos'
import PlayerClient from '@/components/PlayerClient'

interface PlayerLoaderProps {
  id: string
}

export default function PlayerLoader({ id }: PlayerLoaderProps) {
  const [video, setVideo] = useState<Video | null>(null)
  const [status, setStatus] = useState<'loading' | 'not-found' | 'error' | 'ready'>('loading')

  useEffect(() => {
    fetch(`/api/videos/${id}`)
      .then(async (res) => {
        if (res.status === 404) {
          setStatus('not-found')
          return
        }
        if (!res.ok) {
          setStatus('error')
          return
        }
        const data: Video = await res.json()
        setVideo(data)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [id])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-on-surface-variant">Loading…</p>
      </div>
    )
  }

  if (status === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-on-surface-variant">Video not found.</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-on-surface-variant">Failed to load video.</p>
      </div>
    )
  }

  return <PlayerClient video={video!} />
}
