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
          className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors flex-shrink-0"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
