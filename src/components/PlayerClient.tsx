'use client'

import { useEffect, useState } from 'react'
import { Video } from '@/lib/videos'
import { TranscriptCue } from '@/lib/parse-transcript'

interface WordCard {
  word: string
  status: 'new' | 'added' | 'mastered'
}

function extractVocabWords(cues: TranscriptCue[]): WordCard[] {
  const allText = cues.map((c) => c.text).join(' ')
  const words = allText
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, '').toLowerCase())
    .filter((w) => w.length >= 5)
  const unique = Array.from(new Set(words)).slice(0, 8)
  return unique.map((word) => ({ word, status: 'new' }))
}

export default function PlayerClient({ video }: { video: Video }) {
  const [cues, setCues] = useState<TranscriptCue[]>([])
  const [loadingTranscript, setLoadingTranscript] = useState(true)
  const [activeCueIndex, setActiveCueIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<'transcript' | 'vocabulary'>('transcript')
  const [vocabWords, setVocabWords] = useState<WordCard[]>([])

  useEffect(() => {
    fetch(`/api/videos/${video.id}/transcript`)
      .then((r) => r.json())
      .then((data) => {
        const fetchedCues: TranscriptCue[] = data.cues ?? []
        setCues(fetchedCues)
        setVocabWords(extractVocabWords(fetchedCues))
      })
      .catch(() => {
        setCues([])
        setVocabWords([])
      })
      .finally(() => setLoadingTranscript(false))
  }, [video.id])

  function handleWordAction(word: string, action: 'add' | 'master') {
    setVocabWords((prev) =>
      prev.map((w) =>
        w.word === word ? { ...w, status: action === 'add' ? 'added' : 'mastered' } : w
      )
    )
  }

  return (
    <div data-testid="player-client" className="ml-64 pt-16 min-h-screen flex bg-surface">
      {/* Main content */}
      <section className="flex-1 p-8 bg-surface overflow-y-auto">
        <div className="aspect-video rounded-xl overflow-hidden shadow-2xl mb-6 bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtube_id}`}
            className="w-full h-full"
            allowFullScreen
            title={video.title}
          />
        </div>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex gap-2 mb-2">
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-secondary-container text-on-secondary-container">
                Intermediate
              </span>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-surface-container-highest text-on-surface-variant">
                Language Learning
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-on-surface font-headline">{video.title}</h1>
            <p className="text-on-surface-variant mt-1">{video.author_name}</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold hover:scale-[1.02] transition-transform">
            Save Lesson
          </button>
        </div>
      </section>

      {/* Right transcript/vocab sidebar */}
      <aside className="w-[420px] bg-surface-container-low flex flex-col border-l border-outline-variant/30 overflow-hidden min-h-screen">
        <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between">
          <h2 className="font-bold text-on-surface">Interactive Transcript</h2>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-outline-variant/20">
          <button
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              activeTab === 'transcript'
                ? 'text-primary border-b-2 border-primary'
                : 'font-medium text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => setActiveTab('transcript')}
            data-testid="tab-transcript"
          >
            Transcript
          </button>
          <button
            className={`flex-1 py-3 text-sm transition-colors ${
              activeTab === 'vocabulary'
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'font-medium text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => setActiveTab('vocabulary')}
            data-testid="tab-vocabulary"
          >
            Vocabulary
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'transcript' && (
            <>
              {loadingTranscript && (
                <p className="text-sm text-on-surface-variant text-center py-8">
                  Loading transcript…
                </p>
              )}
              {!loadingTranscript && cues.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <span className="text-3xl">📄</span>
                  <p className="text-on-surface font-semibold">No transcript available</p>
                  <p className="text-sm text-on-surface-variant">
                    Upload a transcript file to enable interactive subtitles.
                  </p>
                </div>
              )}
              {!loadingTranscript &&
                cues.map((cue, i) => {
                  const isPast = i < activeCueIndex
                  const isActive = i === activeCueIndex
                  return (
                    <div
                      key={cue.index}
                      onClick={() => setActiveCueIndex(i)}
                      data-testid={`cue-${i}`}
                      className={`cursor-pointer transition-all ${
                        isPast
                          ? 'opacity-40 text-sm text-on-surface-variant px-3 py-2'
                          : isActive
                          ? 'bg-surface-container rounded-xl p-3 ring-1 ring-primary/10 border-l-4 border-primary'
                          : 'opacity-60 text-sm text-on-surface px-3 py-2'
                      }`}
                    >
                      {isActive ? (
                        <p className="text-sm text-on-surface leading-relaxed">{cue.text}</p>
                      ) : (
                        cue.text
                      )}
                    </div>
                  )
                })}
            </>
          )}

          {activeTab === 'vocabulary' && (
            <>
              {vocabWords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <span className="text-3xl">📚</span>
                  <p className="text-on-surface font-semibold">No vocabulary yet</p>
                  <p className="text-sm text-on-surface-variant">
                    Words from the transcript will appear here.
                  </p>
                </div>
              ) : (
                vocabWords.map(({ word, status }) => (
                  <div
                    key={word}
                    data-testid={`vocab-${word}`}
                    className="bg-surface-container rounded-xl p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-on-surface capitalize">{word}</span>
                      {status === 'added' && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-secondary-container text-on-secondary-container">
                          Added
                        </span>
                      )}
                      {status === 'mastered' && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-primary text-on-primary">
                          Mastered
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleWordAction(word, 'add')}
                        disabled={status !== 'new'}
                        className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-primary-container text-on-primary-container hover:opacity-80 disabled:opacity-40 transition-opacity"
                      >
                        {status === 'added' ? 'Added to Deck' : 'Add to Deck'}
                      </button>
                      <button
                        onClick={() => handleWordAction(word, 'master')}
                        disabled={status === 'mastered'}
                        className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-surface-container-highest text-on-surface-variant hover:opacity-80 disabled:opacity-40 transition-opacity"
                      >
                        {status === 'mastered' ? 'Mastered ✓' : 'Mark Mastered'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
