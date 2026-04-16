'use client'

import { useEffect, useState } from 'react'
import { Video } from '@/lib/videos'
import { TranscriptCue } from '@/lib/parse-transcript'
import LessonHero from '@/components/LessonHero'
import MiniPlayer from '@/components/MiniPlayer'
import PlaybackProgress from '@/components/PlaybackProgress'

interface WordCard {
  word: string
  status: 'new' | 'added' | 'mastered'
}

function parseTimeToSeconds(timestamp: string): number {
  const normalized = timestamp.trim().replace(',', '.')
  const match = normalized.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/)
  if (!match) return 0

  const [, hh, mm, ss, ms] = match
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss) + Number(ms) / 1000
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
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false)
  const [playbackTime, setPlaybackTime] = useState({ current: 0, duration: 0 })
  const [requestedSeekTime, setRequestedSeekTime] = useState<number | null>(null)

  function handleTimeUpdate(current: number, duration: number) {
    setPlaybackTime({ current, duration })
  }

  function handleClose() {
    setIsMiniPlayerOpen(false)
    setPlaybackTime({ current: 0, duration: 0 })
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

  useEffect(() => {
    if (!isMiniPlayerOpen || cues.length === 0) return

    const now = playbackTime.current
    const cueIndex = cues.findIndex((cue) => {
      const start = parseTimeToSeconds(cue.startTime)
      const end = parseTimeToSeconds(cue.endTime)
      return now >= start && now < end
    })

    if (cueIndex >= 0 && cueIndex !== activeCueIndex) {
      setActiveCueIndex(cueIndex)
    }
  }, [activeCueIndex, cues, isMiniPlayerOpen, playbackTime.current])

  useEffect(() => {
    const activeElement = document.querySelector(`[data-testid="cue-${activeCueIndex}"]`)
    if (activeElement) {
      ;(activeElement as HTMLElement).scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    }
  }, [activeCueIndex])

  function handleWordAction(word: string, action: 'add' | 'master') {
    setVocabWords((prev) =>
      prev.map((w) =>
        w.word === word ? { ...w, status: action === 'add' ? 'added' : 'mastered' } : w
      )
    )
  }

  return (
    <div data-testid="player-client" className="min-h-screen bg-surface dark:bg-slate-900">
      <section className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
        <LessonHero video={video} onPlay={() => setIsMiniPlayerOpen(true)} />
        {isMiniPlayerOpen && (
          <PlaybackProgress currentTime={playbackTime.current} duration={playbackTime.duration} />
        )}
        <div className="rounded-2xl bg-surface-container-low dark:bg-slate-950/50 border border-outline-variant/30 dark:border-slate-700 overflow-hidden min-h-[540px] flex flex-col">
          <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between">
            <h2 className="font-bold text-on-surface dark:text-slate-100">Interactive Transcript</h2>
          </div>

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

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeTab === 'transcript' && (
              <>
                {loadingTranscript && (
                  <p className="text-sm text-on-surface-variant dark:text-slate-400 text-center py-8">
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
                        onClick={() => {
                          setActiveCueIndex(i)
                          setRequestedSeekTime(parseTimeToSeconds(cue.startTime))
                        }}
                        data-testid={`cue-${i}`}
                        className={`cursor-pointer transition-all ${
                          isPast
                            ? 'opacity-40 text-sm text-on-surface-variant dark:text-slate-400 px-3 py-2'
                            : isActive
                            ? 'bg-surface-container dark:bg-slate-800 rounded-xl p-3 ring-1 ring-primary/10 border-l-4 border-primary'
                            : 'opacity-60 text-sm text-on-surface dark:text-slate-100 px-3 py-2'
                        }`}
                      >
                        {isActive ? (
                          <p className="text-sm text-on-surface dark:text-slate-100 leading-relaxed">{cue.text}</p>
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
        </div>
      </section>

      {isMiniPlayerOpen && (
        <MiniPlayer
          youtubeId={video.youtube_id}
          title={video.title}
          onClose={handleClose}
          onTimeUpdate={handleTimeUpdate}
          seekToTime={requestedSeekTime}
          onSeekApplied={() => setRequestedSeekTime(null)}
        />
      )}
    </div>
  )
}
