'use client'

import { useRef, useEffect } from 'react'
import { TranscriptCue, parseTimeToSeconds } from '@/lib/parse-transcript'
import CueText from '@/components/CueText'

export const CUES_PER_PAGE = 10

interface TranscriptPanelProps {
  cues: TranscriptCue[]
  activeCueIndex: number
  currentPage: number
  onPageChange: (page: number) => void
  loading: boolean
  currentTime?: number
  onSeek?: (seconds: number) => void
}

export default function TranscriptPanel({
  cues,
  activeCueIndex,
  currentPage,
  onPageChange,
  loading,
  currentTime,
  onSeek,
}: TranscriptPanelProps) {
  const activeCueRef = useRef<HTMLDivElement | null>(null)

  const totalPages = Math.ceil(cues.length / CUES_PER_PAGE)
  const pageOffset = currentPage * CUES_PER_PAGE
  const pageCues = cues.slice(pageOffset, pageOffset + CUES_PER_PAGE)

  useEffect(() => {
    activeCueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeCueIndex])

  if (loading) {
    return (
      <div data-testid="transcript-panel">
        <p className="text-sm text-on-surface-variant dark:text-slate-400 text-center py-8">
          Loading transcript…
        </p>
      </div>
    )
  }

  if (cues.length === 0) {
    return (
      <div data-testid="transcript-panel" className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <span className="text-3xl">📄</span>
        <p className="text-on-surface font-semibold">No transcript available</p>
        <p className="text-sm text-on-surface-variant">
          Upload a transcript file to enable interactive subtitles.
        </p>
      </div>
    )
  }

  return (
    <div data-testid="transcript-panel" className="flex flex-col gap-3">
      <div className="space-y-1">
        {pageCues.map((cue, i) => {
          const absoluteIndex = pageOffset + i
          const isPast = absoluteIndex < activeCueIndex
          const isActive = absoluteIndex === activeCueIndex

          return (
            <div
              key={cue.index}
              ref={isActive ? activeCueRef : null}
              data-testid={isActive ? 'cue-active' : `cue-${i}`}
              onClick={() => onSeek?.(parseTimeToSeconds(cue.startTime))}
              className={`cursor-pointer transition-all ${
                isPast
                  ? 'opacity-40 text-sm text-on-surface-variant dark:text-slate-400 px-3 py-2'
                  : isActive
                  ? 'bg-surface-container dark:bg-slate-800 rounded-xl p-3 ring-1 ring-primary/10 border-l-4 border-primary'
                  : 'opacity-60 text-sm text-on-surface dark:text-slate-100 px-3 py-2'
              }`}
            >
              {isActive && currentTime !== undefined ? (
                <CueText
                  text={cue.text}
                  cueStart={parseTimeToSeconds(cue.startTime)}
                  cueEnd={parseTimeToSeconds(cue.endTime)}
                  currentTime={currentTime}
                  onWordClick={onSeek}
                />
              ) : isActive ? (
                <p className="text-sm text-on-surface dark:text-slate-100 leading-relaxed">{cue.text}</p>
              ) : (
                cue.text
              )}
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
          <button
            data-testid="transcript-prev-page"
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-3 py-1 text-xs font-medium rounded-lg bg-surface-container text-on-surface-variant hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            ← Prev
          </button>
          <span
            data-testid="transcript-page-indicator"
            className="text-xs text-on-surface-variant"
          >
            {currentPage + 1} / {totalPages}
          </span>
          <button
            data-testid="transcript-next-page"
            onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="px-3 py-1 text-xs font-medium rounded-lg bg-surface-container text-on-surface-variant hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
