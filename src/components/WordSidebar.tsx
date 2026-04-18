'use client'

import { useEffect, useRef } from 'react'
import { VocabWord } from '@/lib/vocabulary'

interface WordSidebarProps {
  word: string
  contextSentence: string
  vocabEntry: VocabWord | undefined
  onClose: () => void
}

const STATUS_STYLES: Record<VocabWord['status'], string> = {
  mastered: 'text-green-600 bg-green-50 border-green-200',
  learning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  new: 'text-red-600 bg-red-50 border-red-200',
}

const STATUS_LABELS: Record<VocabWord['status'], string> = {
  mastered: 'Mastered',
  learning: 'Learning',
  new: 'New',
}

export default function WordSidebar({ word, contextSentence, vocabEntry, onClose }: WordSidebarProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Word details"
        data-testid="word-sidebar"
        className="fixed top-0 right-0 z-50 h-full w-80 max-w-full bg-surface dark:bg-slate-900 border-l border-outline-variant/30 dark:border-slate-700 shadow-xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-outline-variant/20 dark:border-slate-700">
          <h2 className="text-lg font-bold text-on-surface dark:text-slate-100">Word Details</h2>
          <button
            onClick={onClose}
            aria-label="Close word sidebar"
            data-testid="word-sidebar-close"
            className="rounded-full p-1.5 hover:bg-surface-container dark:hover:bg-slate-800 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-on-surface-variant dark:text-slate-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Word display */}
          <div className="flex flex-col gap-2">
            <span
              data-testid="sidebar-word"
              className={`text-3xl font-bold capitalize inline-block px-3 py-1 rounded-lg border ${
                vocabEntry ? STATUS_STYLES[vocabEntry.status] : 'text-on-surface dark:text-slate-100 bg-surface-container dark:bg-slate-800 border-outline-variant/30'
              }`}
            >
              {word}
            </span>
            {vocabEntry && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit border ${STATUS_STYLES[vocabEntry.status]}`}>
                {STATUS_LABELS[vocabEntry.status]}
              </span>
            )}
          </div>

          {/* Vocab details */}
          {vocabEntry && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-surface-container dark:bg-slate-800 text-on-surface-variant dark:text-slate-400">
                  {vocabEntry.level}
                </span>
                <span className="text-xs text-on-surface-variant dark:text-slate-400">{vocabEntry.source}</span>
              </div>
              <p className="text-sm text-on-surface dark:text-slate-200 leading-relaxed">{vocabEntry.definition}</p>
            </div>
          )}

          {/* Context sentence */}
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-on-surface-variant dark:text-slate-400">
              Context
            </h3>
            <p
              data-testid="sidebar-context"
              className="text-sm text-on-surface dark:text-slate-200 leading-relaxed bg-surface-container dark:bg-slate-800 rounded-lg p-3 italic"
            >
              {contextSentence}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
