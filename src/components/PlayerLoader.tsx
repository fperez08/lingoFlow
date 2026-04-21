'use client'

import { usePlayerData } from '@/hooks/usePlayerData'
import PlayerClient from '@/components/PlayerClient'

interface PlayerLoaderProps {
  id: string
}

export default function PlayerLoader({ id }: PlayerLoaderProps) {
  const { video, cues, isLoading, error } = usePlayerData(id)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-on-surface-variant">Loading…</p>
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-on-surface-variant">Failed to load video.</p>
      </div>
    )
  }

  return <PlayerClient video={video} cues={cues ?? []} />
}

