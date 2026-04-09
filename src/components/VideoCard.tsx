'use client'

export interface VideoCardProps {
  id: string
  title: string
  author_name: string
  thumbnail_url: string
  youtube_url: string
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
  youtube_url,
  tags,
  created_at,
  onDelete,
  onEdit,
}: VideoCardProps) {
  return (
    <div className="video-card-wrapper" style={{ position: 'relative' }}>
      {(onDelete || onEdit) && (
        <div className="video-card-overlay">
          {onEdit && (
            <button
              aria-label="Edit video"
              data-testid="edit-button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit() }}
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button
              aria-label="Delete video"
              data-testid="delete-button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.() }}
            >
              🗑️
            </button>
          )}
        </div>
      )}
      <div className="video-card" data-testid={`video-card-${id}`}>
        <a href={youtube_url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbnail_url} alt={title} className="video-thumbnail" />
        </a>
        <div className="video-content">
          <h3 className="video-title">
            <a href={youtube_url} target="_blank" rel="noopener noreferrer">
              {title}
            </a>
          </h3>
          <p className="video-author">{author_name}</p>
          {tags.length > 0 && (
            <div className="video-tags">
              {tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="video-date">{formatDate(created_at)}</p>
        </div>
      </div>
    </div>
  )
}
