'use client'

import { useEffect, useState } from 'react'
import { Video } from '@/lib/videos'
import { TranscriptCue } from '@/lib/parse-transcript'
import LessonHero from '@/components/LessonHero'
import LocalVideoPlayer from '@/components/LocalVideoPlayer'
import PlaybackProgress from '@/components/PlaybackProgress'
import CueText from '@/components/CueText'
import WordSidebar from '@/components/WordSidebar'
import { useVocabulary, useUpdateWordStatus } from '@/hooks/useVocabulary'

interface SelectedWord {
  word: string
  contextSentence: string
  transcriptContext: string[]
  cueIndex: number
}

function parseTimeToSeconds(timestamp: string): number {
  const normalized = timestamp.trim().replace(',', '.')
  const match = normalized.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/)
  if (!match) return 0

  const [, hh, mm, ss, ms] = match
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss) + Number(ms) / 1000
}

function buildTranscriptContext(cues: TranscriptCue[], cueIndex: number): string[] {
  const context: string[] = []

  if (cueIndex > 0) {
    context.push(cues[cueIndex - 1].text)
  }

  context.push(cues[cueIndex].text)

  if (cueIndex < cues.length - 1) {
    context.push(cues[cueIndex + 1].text)
  }

  return context
}

export default function PlayerClient({ video, cues: propCues }: { video: Video; cues?: TranscriptCue[] }) {
  const { data: vocabMap = new Map() } = useVocabulary()
  const updateWordStatus = useUpdateWordStatus()
  const [fetchedCues, setFetchedCues] = useState<TranscriptCue[]>([])
  const [loadingTranscript, setLoadingTranscript] = useState(propCues === undefined)
  const [activeCueIndex, setActiveCueIndex] = useState(0)
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false)
  const [playbackTime, setPlaybackTime] = useState({ current: 0, duration: 0 })
  const [requestedSeekTime, setRequestedSeekTime] = useState<number | null>(null)
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null)
  const cues = propCues ?? fetchedCues

  function handleTimeUpdate(current: number, duration: number) {
    setPlaybackTime({ current, duration })
  }

  function handleClose() {
    setIsMiniPlayerOpen(false)
    setPlaybackTime({ current: 0, duration: 0 })
    setActiveCueIndex(0)
    setRequestedSeekTime(null)
  }

  useEffect(() => {
    if (propCues !== undefined) return
    fetch(`/api/videos/${video.id}/transcript`)
      .then((r) => r.json())
      .then((data) => {
        const fetchedCues: TranscriptCue[] = data.cues ?? []
        setFetchedCues(fetchedCues)
      })
      .catch(() => {
        setFetchedCues([])
      })
      .finally(() => setLoadingTranscript(false))
  }, [propCues, video.id])

  const playbackCueIndex = (() => {
    if (!isMiniPlayerOpen || cues.length === 0) return -1
    const now = playbackTime.current
    return cues.findIndex((cue) => {
      const start = parseTimeToSeconds(cue.startTime)
      const end = parseTimeToSeconds(cue.endTime)
      return now >= start && now < end
    })
  })()

  const highlightedCueIndex = playbackCueIndex >= 0 ? playbackCueIndex : activeCueIndex

  useEffect(() => {
    const activeElement = document.querySelector(`[data-testid="cue-${highlightedCueIndex}"]`)
    if (activeElement) {
      ;(activeElement as HTMLElement).scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    }
  }, [highlightedCueIndex])

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

          <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${isMiniPlayerOpen ? 'pb-52' : ''}`}>
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
                  const isPast = i < highlightedCueIndex
                  const isActive = i === highlightedCueIndex
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
                        <p className="text-sm text-on-surface dark:text-slate-100 leading-relaxed">
                          <CueText
                            text={cue.text}
                            cueIndex={i}
                            vocabMap={vocabMap}
                            onWordClick={(word, sentence, cueIndex) => {
                              const context = buildTranscriptContext(cues, cueIndex)
                              setSelectedWord({ word, contextSentence: sentence, transcriptContext: context, cueIndex })
                            }}
                          />
                        </p>
                      ) : (
                        <CueText
                          text={cue.text}
                          cueIndex={i}
                          vocabMap={vocabMap}
                          onWordClick={(word, sentence, cueIndex) => {
                            const context = buildTranscriptContext(cues, cueIndex)
                            setSelectedWord({ word, contextSentence: sentence, transcriptContext: context, cueIndex })
                          }}
                        />
                      )}
                    </div>
                  )
                })}
            </>
          </div>
        </div>
      </section>

      {isMiniPlayerOpen && (
        <LocalVideoPlayer
          videoId={video.id}
          title={video.title}
          onClose={handleClose}
          onTimeUpdate={handleTimeUpdate}
          seekToTime={requestedSeekTime}
          onSeekApplied={() => setRequestedSeekTime(null)}
          isSidebarOpen={selectedWord !== null}
        />
      )}

      {selectedWord && (
        <WordSidebar
          word={selectedWord.word}
          contextSentence={selectedWord.contextSentence}
          transcriptContext={selectedWord.transcriptContext}
          vocabEntry={vocabMap.get(selectedWord.word.toLowerCase())}
          onClose={() => setSelectedWord(null)}
          onStatusChange={(w, status) => updateWordStatus.mutate({ word: w, status })}
          isUpdating={updateWordStatus.isPending}
        />
      )}
    </div>
  )
}
