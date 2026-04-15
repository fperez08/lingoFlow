'use client'

interface PlaybackProgressProps {
  currentTime: number // seconds
  duration: number // seconds (0 while metadata not loaded)
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PlaybackProgress({ currentTime, duration }: PlaybackProgressProps) {
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div data-testid="playback-progress" className="w-full mt-4">
      <div className="h-1.5 rounded-full bg-outline-variant/30 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-200"
          style={{ width: `${pct}%` }}
          data-testid="progress-bar-fill"
        />
      </div>
      <div className="flex justify-between text-xs text-on-surface-variant mt-1">
        <span data-testid="current-time">{formatTime(currentTime)}</span>
        <span data-testid="duration">{formatTime(duration)}</span>
      </div>
    </div>
  )
}
