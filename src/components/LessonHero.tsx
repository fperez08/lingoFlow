'use client'

import { Video } from '@/lib/videos'

interface LessonHeroProps {
  video: Video
  onPlay: () => void
}

export default function LessonHero({ video, onPlay }: LessonHeroProps) {
  return (
    <div data-testid="lesson-hero" className="mb-6">
      <div className="flex items-stretch justify-between gap-4">
        <div className="flex flex-1 min-h-[10rem] flex-col">
          {video.tags.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {video.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs font-bold rounded-full bg-surface-container-highest text-on-surface-variant"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-2xl font-extrabold text-on-surface dark:text-slate-100 font-headline">
            {video.title}
          </h1>
          <p className="text-on-surface-variant dark:text-slate-400 mt-1">{video.author_name}</p>
        </div>
        <button
          onClick={onPlay}
          aria-label="Play video"
          data-testid="play-button"
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold hover:scale-[1.02] transition-transform whitespace-nowrap"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
          Play Lesson
        </button>
      </div>
    </div>
  )
}
