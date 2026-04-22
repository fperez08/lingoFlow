'use client'

import { tokenizeCueText } from '@/lib/tokenize-transcript'
import { VocabInfo } from '@/lib/vocabulary'

interface CueTextProps {
  text: string
  cueIndex: number
  vocabMap: Map<string, VocabInfo>
  onWordClick: (word: string, sentence: string, cueIndex: number) => void
}

const STATUS_WORD_STYLES: Record<VocabInfo['status'], string> = {
  mastered: 'text-green-600 bg-green-50 rounded cursor-pointer hover:bg-green-100 transition-colors',
  learning: 'text-yellow-600 bg-yellow-50 rounded cursor-pointer hover:bg-yellow-100 transition-colors',
  new: 'text-red-600 bg-red-50 rounded cursor-pointer hover:bg-red-100 transition-colors',
}

const DEFAULT_WORD_STYLE = 'cursor-pointer hover:bg-surface-container dark:hover:bg-slate-700 rounded transition-colors'

export default function CueText({ text, cueIndex, vocabMap, onWordClick }: CueTextProps) {
  const tokens = tokenizeCueText(text)

  return (
    <span>
      {tokens.map((token, i) => {
        if (token.type === 'punct') {
          return <span key={i}>{token.raw}</span>
        }

        const entry = vocabMap.get(token.normalized)
        const style = entry ? STATUS_WORD_STYLES[entry.status] : DEFAULT_WORD_STYLE

        return (
          <span
            key={i}
            role="button"
            tabIndex={0}
            data-testid={`word-${token.normalized}`}
            className={`inline px-0.5 ${style}`}
            onClick={(e) => {
              e.stopPropagation()
              onWordClick(token.raw, text, cueIndex)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation()
                onWordClick(token.raw, text, cueIndex)
              }
            }}
          >
            {token.raw}
          </span>
        )
      })}
    </span>
  )
}
