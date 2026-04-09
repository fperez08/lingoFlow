'use client'

import { VideoCardProps } from './VideoCard'

interface DeleteVideoModalProps {
  video: VideoCardProps | null
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
}

export default function DeleteVideoModal({
  video,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteVideoModalProps) {
  if (!video) return null

  return (
    <div data-testid="delete-modal">
      <p>Delete &quot;{video.title}&quot;?</p>
      <button data-testid="cancel-button" onClick={onClose}>
        Cancel
      </button>
      <button
        data-testid="confirm-delete-button"
        onClick={onConfirm}
        disabled={isDeleting}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  )
}
