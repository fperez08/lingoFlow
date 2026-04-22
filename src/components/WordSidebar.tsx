'use client'

import { useEffect, useRef, useState } from 'react'
import { VocabInfo } from '@/lib/vocabulary'

interface WordSidebarProps {
  word: string
  contextSentence: string
  transcriptContext?: string[]
  vocabEntry: VocabInfo | undefined
  onClose: () => void
  onStatusChange?: (word: string, status: 'new' | 'learning' | 'mastered') => void
  isUpdating?: boolean
}

interface GeneratedDefinition {
  definition: string
  partOfSpeech?: string
  example?: string
}

const STATUS_STYLES: Record<VocabInfo['status'], string> = {
  mastered: 'text-green-600 bg-green-50 border-green-200',
  learning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  new: 'text-red-600 bg-red-50 border-red-200',
}

const STATUS_LABELS: Record<VocabInfo['status'], string> = {
  mastered: 'Mastered',
  learning: 'Learning',
  new: 'New',
}

export default function WordSidebar({
  word,
  contextSentence,
  transcriptContext,
  vocabEntry,
  onClose,
  onStatusChange,
  isUpdating = false,
}: WordSidebarProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [generatedDefinition, setGeneratedDefinition] = useState<GeneratedDefinition | null>(null)
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false)
  const [definitionError, setDefinitionError] = useState<string | null>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const isKnown = vocabEntry?.status === 'mastered'

  function handleToggle() {
    if (!onStatusChange) return
    const nextStatus = isKnown ? 'new' : 'mastered'
    onStatusChange(word, nextStatus)
  }

  async function handleGenerateDefinition() {
    setIsLoadingDefinition(true)
    setDefinitionError(null)
    try {
      const body: Record<string, unknown> = { word, contextSentence }
      if (transcriptContext) {
        body.transcriptContext = transcriptContext
      }

      const response = await fetch('/api/dictionary/define', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate definition')
      }

      const data = (await response.json()) as GeneratedDefinition
      setGeneratedDefinition(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred'
      setDefinitionError(message)
    } finally {
      setIsLoadingDefinition(false)
    }
  }

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
                {vocabEntry.level && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-surface-container dark:bg-slate-800 text-on-surface-variant dark:text-slate-400">
                    {vocabEntry.level}
                  </span>
                )}
                {vocabEntry.source && (
                  <span className="text-xs text-on-surface-variant dark:text-slate-400">{vocabEntry.source}</span>
                )}
              </div>
              {vocabEntry.definition && (
                <p className="text-sm text-on-surface dark:text-slate-200 leading-relaxed">{vocabEntry.definition}</p>
              )}
            </div>
          )}

          {/* Status toggle */}
          {onStatusChange && (
            <button
              data-testid="status-toggle"
              onClick={handleToggle}
              disabled={isUpdating}
              className={`w-full py-2 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50 ${
                isKnown
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {isUpdating
                ? 'Saving…'
                : isKnown
                ? 'Mark as unknown'
                : 'Mark as known'}
            </button>
          )}

          {/* AI Definition Section */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleGenerateDefinition}
              disabled={isLoadingDefinition}
              data-testid="generate-definition-btn"
              className="w-full py-2 rounded-xl text-sm font-bold transition-opacity bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50"
            >
              {isLoadingDefinition ? 'Generating...' : 'Generate Definition'}
            </button>

            {definitionError && (
              <div
                data-testid="definition-error"
                className="text-sm text-red-600 bg-red-50 rounded-lg p-3 border border-red-200"
              >
                {definitionError}
              </div>
            )}

            {generatedDefinition && (
              <div
                data-testid="generated-definition"
                className="flex flex-col gap-2 bg-blue-50 dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-slate-700"
              >
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {generatedDefinition.definition}
                </p>
                {generatedDefinition.partOfSpeech && (
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Part of speech: <span className="font-semibold">{generatedDefinition.partOfSpeech}</span>
                  </p>
                )}
                {generatedDefinition.example && (
                  <p className="text-xs text-blue-700 dark:text-blue-300 italic">
                    Example: {generatedDefinition.example}
                  </p>
                )}
              </div>
            )}
          </div>

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
