'use client'

import Link from 'next/link'

export interface VideoCardProps {
  id: string
  title: string
  author_name: string
  thumbnail_url: string
  source_type?: 'youtube' | 'local'
  tags: string[]
  created_at: string
  onDelete?: () => void
  onEdit?: () => void
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function VideoCard({
  id,
  title,
  author_name,
  thumbnail_url,
  source_type,
  tags,
  created_at,
  onDelete,
  onEdit,
}: VideoCardProps) {
  const displayThumbnail = source_type === 'local' ? `/api/videos/${id}/thumbnail` : thumbnail_url

  return (
    <div className="group cursor-pointer" data-testid={`video-card-${id}`}>
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden mb-4 bg-surface-container-high dark:bg-slate-800 shadow-sm transition-all group-hover:-translate-y-1">
        <Link href={`/player/${id}`}>
          {displayThumbnail ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={displayThumbnail}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-container-high dark:bg-slate-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-on-surface-variant/30" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v12h16V6H4zm6.5 3.5l5 3-5 3v-6z"/>
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-primary shadow-xl">▶</div>
          </div>
        </Link>

        {/* Action buttons */}
        {(onEdit || onDelete) && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                aria-label="Edit video"
                data-testid="edit-button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit() }}
                className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-sm shadow hover:bg-white transition-colors"
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button
                aria-label="Delete video"
                data-testid="delete-button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.() }}
                className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-sm shadow hover:bg-white transition-colors"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="space-y-2">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag} className="text-[10px] font-bold uppercase tracking-wider text-primary">
                {tag}
              </span>
            ))}
          </div>
        )}
        <Link href={`/player/${id}`}>
          <h4 className="font-bold text-on-surface dark:text-slate-100 group-hover:text-primary transition-colors leading-tight">
            {title}
          </h4>
        </Link>
        <p className="text-xs text-on-surface-variant dark:text-slate-400">
          Imported <span>{formatDate(created_at)}</span> &bull; By <span>{author_name}</span>
        </p>
      </div>
    </div>
  )
}
