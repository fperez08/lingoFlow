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
    <div
      data-testid="delete-modal"
      className="fixed inset-0 bg-black/40 backdrop-blur-[6px] z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest/90 dark:bg-slate-900/90 backdrop-blur-[24px] rounded-xl shadow-2xl border border-outline-variant/20 dark:border-slate-700/30 w-full max-w-md p-8 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-error" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="font-headline text-2xl font-extrabold text-on-surface dark:text-slate-100">Delete Video</h2>
        </div>

        <p className="text-on-surface-variant dark:text-slate-400 mb-6">
          Delete &quot;{video.title}&quot;? This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3">
          <button
            data-testid="cancel-button"
            onClick={onClose}
            className="px-6 py-3 bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-400 rounded-xl font-bold hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            data-testid="confirm-delete-button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-gradient-to-br from-error to-error text-on-error rounded-xl font-bold px-6 py-3 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
