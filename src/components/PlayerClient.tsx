'use client'

import { useEffect, useRef, useState } from 'react'
import { Video } from '@/lib/videos'
import { TranscriptCue, findActiveCueIndex } from '@/lib/parse-transcript'
import LessonHero from '@/components/LessonHero'
import MiniPlayer, { MiniPlayerHandle } from '@/components/MiniPlayer'
import PlaybackProgress from '@/components/PlaybackProgress'
import TranscriptPanel, { CUES_PER_PAGE } from '@/components/TranscriptPanel'

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
  const [activeCueIndex, setActiveCueIndex] = useState(-1)
  const [currentPage, setCurrentPage] = useState(0)
  const [activeTab, setActiveTab] = useState<'transcript' | 'vocabulary'>('transcript')
  const [vocabWords, setVocabWords] = useState<WordCard[]>([])
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false)
  const [playbackTime, setPlaybackTime] = useState({ current: 0, duration: 0 })
  const miniPlayerRef = useRef<MiniPlayerHandle>(null)

  function handleTimeUpdate(current: number, duration: number) {
    setPlaybackTime({ current, duration })

    const newActiveCueIndex = findActiveCueIndex(cues, current)
    setActiveCueIndex(newActiveCueIndex)

    if (newActiveCueIndex >= 0) {
      const targetPage = Math.floor(newActiveCueIndex / CUES_PER_PAGE)
      setCurrentPage((prev) => (targetPage !== prev ? targetPage : prev))
    }
  }

  function handleClose() {
    setIsMiniPlayerOpen(false)
    setPlaybackTime({ current: 0, duration: 0 })
  }

  function handleSeek(seconds: number) {
    miniPlayerRef.current?.seekTo(seconds)
  }

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
    <div data-testid="player-client" className="min-h-screen flex flex-col lg:flex-row bg-surface dark:bg-slate-900">
      {/* Main content */}
      <section className="flex-1 p-8 bg-surface dark:bg-slate-900 overflow-y-auto">
        <LessonHero video={video} onPlay={() => setIsMiniPlayerOpen(true)} />
        {isMiniPlayerOpen && (
          <PlaybackProgress
            currentTime={playbackTime.current}
            duration={playbackTime.duration}
          />
        )}
      </section>

      {isMiniPlayerOpen && (
        <MiniPlayer
          ref={miniPlayerRef}
          youtubeId={video.youtube_id}
          title={video.title}
          onClose={handleClose}
          onTimeUpdate={handleTimeUpdate}
        />
      )}

      {/* Right transcript/vocab sidebar */}
      <aside className="w-full lg:w-[420px] bg-surface-container-low dark:bg-slate-950/50 flex flex-col border-t lg:border-t-0 lg:border-l border-outline-variant/30 dark:border-slate-700 overflow-hidden min-h-[400px] lg:min-h-screen">
        <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between">
          <h2 className="font-bold text-on-surface dark:text-slate-100">Interactive Transcript</h2>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-outline-variant/20 dark:border-slate-700">
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
            <TranscriptPanel
              cues={cues}
              activeCueIndex={activeCueIndex}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              loading={loadingTranscript}
              currentTime={playbackTime.current}
              onSeek={handleSeek}
            />
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
                    className="bg-surface-container dark:bg-slate-800 rounded-xl p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-on-surface dark:text-slate-100 capitalize">{word}</span>
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
