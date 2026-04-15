'use client'

import { tokenizeWords } from '@/lib/parse-transcript'

interface CueTextProps {
  text: string
  cueStart: number
  cueEnd: number
  currentTime: number
  onWordClick?: (seekTime: number) => void
}

export default function CueText({ text, cueStart, cueEnd, currentTime, onWordClick }: CueTextProps) {
  const words = tokenizeWords(text)
  const cueDuration = cueEnd - cueStart
  const elapsed = currentTime - cueStart
  const fraction = cueDuration > 0 ? Math.min(Math.max(elapsed / cueDuration, 0), 1) : 0
  const highlightedIndex = words.length > 0
    ? Math.min(Math.floor(fraction * words.length), words.length - 1)
    : -1

  return (
    <p
      data-testid="cue-text"
      className="text-sm text-on-surface dark:text-slate-100 leading-relaxed flex flex-wrap gap-x-1"
    >
      {words.map((word, i) => (
        <span
          key={i}
          data-testid={`word-${i}`}
          onClick={() => onWordClick?.(cueStart)}
          className={`cursor-pointer rounded transition-colors ${
            i < highlightedIndex
              ? 'opacity-50 text-on-surface-variant dark:text-slate-400'
              : i === highlightedIndex
              ? 'bg-primary text-on-primary px-0.5'
              : 'text-on-surface dark:text-slate-100'
          }`}
        >
          {word}
        </span>
      ))}
    </p>
  )
}
