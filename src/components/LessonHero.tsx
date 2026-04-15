'use client'

import { useState } from 'react'
import { Video } from '@/lib/videos'

interface LessonHeroProps {
  video: Video
  onPlay: () => void
}

export default function LessonHero({ video, onPlay }: LessonHeroProps) {
  const [imgSrc, setImgSrc] = useState(
    `https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg`
  )

  return (
    <div data-testid="lesson-hero">
      <div
        className="relative aspect-video rounded-xl overflow-hidden shadow-2xl mb-6 bg-black cursor-pointer group"
        onClick={onPlay}
        role="button"
        aria-label="Play video"
        data-testid="hero-play-area"
      >
        <img
          src={imgSrc}
          alt={video.title}
          className="w-full h-full object-cover"
          onError={() =>
            setImgSrc(`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`)
          }
          data-testid="hero-thumbnail"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPlay()
            }}
            aria-label="Play"
            data-testid="play-button"
            className="flex items-center justify-center w-20 h-20 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition"
          >
            <svg
              className="w-10 h-10 text-white drop-shadow-lg ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
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
        <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold hover:scale-[1.02] transition-transform whitespace-nowrap">
          Save Lesson
        </button>
      </div>
    </div>
  )
}
