'use client'

import { useState } from 'react'
import { MOCK_VOCAB, VOCAB_SOURCES, VOCAB_LEVELS, type VocabWord } from '@/lib/vocabulary'

type Tab = 'new' | 'learning' | 'mastered'

const TAB_LABELS: Record<Tab, string> = {
  new: 'New Words',
  learning: 'Learning',
  mastered: 'Mastered',
}

export default function VocabularyPage() {
  const [words, setWords] = useState<VocabWord[]>(MOCK_VOCAB)
  const [activeTab, setActiveTab] = useState<Tab>('new')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSources, setActiveSources] = useState<string[]>([])
  const [activeLevels, setActiveLevels] = useState<string[]>([])

  const countForTab = (tab: Tab) => words.filter((w) => w.status === tab).length

  const filteredWords = words.filter((w) => {
    if (w.status !== activeTab) return false
    if (searchQuery && !w.word.toLowerCase().includes(searchQuery.toLowerCase()) && !w.definition.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (activeSources.length > 0 && !activeSources.includes(w.source)) return false
    if (activeLevels.length > 0 && !activeLevels.includes(w.level)) return false
    return true
  })

  function markMastered(id: string) {
    setWords((prev) => prev.map((w) => (w.id === id ? { ...w, status: 'mastered' } : w)))
  }

  function removeWord(id: string) {
    setWords((prev) => prev.filter((w) => w.id !== id))
  }

  function toggleSource(source: string) {
    setActiveSources((prev) => prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source])
  }

  function toggleLevel(level: string) {
    setActiveLevels((prev) => prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level])
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-wider mb-3">
            Lexicon Management
          </span>
          <h2 data-testid="vocab-page-heading" className="text-4xl font-extrabold tracking-tight text-on-surface dark:text-slate-100">
            Vocabulary Manager
          </h2>
          <p className="text-on-surface-variant dark:text-slate-400 mt-2 max-w-xl font-body leading-relaxed">
            Refine your cognitive sanctuary by reviewing and organizing the linguistic gems you&apos;ve collected.
          </p>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-highest text-on-surface-variant rounded-xl font-bold hover:bg-surface-container-high transition-colors">
            Export CSV
          </button>
          <button className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold hover:scale-[1.02] transition-transform">
            New Entry
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-8">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none">🔍</span>
        <input
          type="text"
          placeholder="Search your vocabulary..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="vocab-search-input"
          className="w-full pl-12 pr-4 py-3 bg-surface-container-low dark:bg-slate-950/50 rounded-xl border border-outline-variant/30 dark:border-slate-700 text-on-surface dark:text-slate-100 placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-outline-variant/20 dark:border-slate-700 mb-8">
        {(['new', 'learning', 'mastered'] as Tab[]).map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              data-testid={`tab-${tab}`}
              className={`px-6 py-3 text-sm font-bold transition-colors ${
                isActive
                  ? 'text-primary border-b-2 border-primary'
                  : 'font-medium text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {TAB_LABELS[tab]}
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-highest text-on-surface-variant'
                }`}
              >
                {countForTab(tab)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Main grid */}
      <div className="grid xl:grid-cols-12 gap-8">
        {/* Word card list — left column */}
        <div className="xl:col-span-8">
          {filteredWords.length === 0 ? (
            <div data-testid="empty-vocab-state" className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
              <p className="text-lg font-medium mb-2">No words found</p>
              <p className="text-sm">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredWords.map((word) => (
                <div
                  key={word.id}
                  data-testid="vocab-card"
                  className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-xl hover:bg-surface-bright dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-primary">{word.word}</h3>
                        <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold uppercase">
                          {word.level}
                        </span>
                      </div>
                      <p className="text-on-surface-variant dark:text-slate-400 text-sm italic mb-3">{word.definition}</p>
                      <div className="bg-surface-container-low dark:bg-slate-950/50 p-4 rounded-lg border-l-4 border-primary/30">
                        <p className="text-sm text-on-surface dark:text-slate-100 leading-relaxed">
                          &ldquo;{word.contextQuote}&rdquo; —{' '}
                          <span className="text-on-surface-variant text-xs uppercase font-bold">{word.source}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {word.status !== 'mastered' && (
                        <button
                          data-testid="mark-mastered-button"
                          onClick={() => markMastered(word.id)}
                          className="p-2 rounded-lg text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container transition-colors"
                          title="Mark as mastered"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        data-testid="remove-button"
                        onClick={() => removeWord(word.id)}
                        className="p-2 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar bento — right column */}
        <div className="xl:col-span-4">
          {/* Learning Momentum card */}
          <div className="bg-primary p-8 rounded-xl text-on-primary mb-6">
            <p className="text-sm font-bold opacity-70 mb-1 uppercase tracking-wider">This Week</p>
            <p className="text-4xl font-extrabold">18</p>
            <p className="text-sm opacity-80 mt-1">Words Learned</p>
            <div className="mt-6 h-2 bg-white/20 rounded-full">
              <div className="h-2 bg-white rounded-full" style={{ width: '70%' }}></div>
            </div>
            <p className="text-xs opacity-60 mt-2">70% of weekly goal</p>
          </div>

          {/* Filter by Source */}
          <div className="bg-surface-container-low dark:bg-slate-950/50 p-6 rounded-xl mb-6">
            <h4 className="font-bold text-on-surface dark:text-slate-100 mb-4 text-sm uppercase tracking-wider">Filter by Source</h4>
            <div className="flex flex-wrap gap-2">
              {VOCAB_SOURCES.map((source) => {
                const isActive = activeSources.includes(source)
                return (
                  <button
                    key={source}
                    data-testid="source-filter-chip"
                    onClick={() => toggleSource(source)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant hover:bg-primary hover:text-on-primary'
                    }`}
                  >
                    {source}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Filter by Difficulty */}
          <div className="bg-surface-container-low dark:bg-slate-950/50 p-6 rounded-xl">
            <h4 className="font-bold text-on-surface dark:text-slate-100 mb-4 text-sm uppercase tracking-wider">Filter by Difficulty</h4>
            <div className="flex flex-wrap gap-2">
              {VOCAB_LEVELS.map((level) => {
                const isActive = activeLevels.includes(level)
                return (
                  <button
                    key={level}
                    data-testid="level-filter-chip"
                    onClick={() => toggleLevel(level)}
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
                      isActive
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant hover:bg-primary hover:text-on-primary'
                    }`}
                  >
                    {level}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
