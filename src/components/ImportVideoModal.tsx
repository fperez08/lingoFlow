'use client'

import { useImportVideoForm } from '@/hooks/useImportVideoForm'

interface ImportVideoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ImportVideoModal({ isOpen, onClose, onSuccess }: ImportVideoModalProps) {
  const {
    youtubeUrl,
    setYoutubeUrl,
    transcriptFile,
    setTranscriptFile,
    tags,
    setTags,
    preview,
    previewError,
    isLoadingPreview,
    isSubmitting,
    submitError,
    handleSubmit,
    canSubmit,
  } = useImportVideoForm({ onSuccess, onClose })

  if (!isOpen) {
    return null
  }

  return (
    <div data-testid="import-modal" className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Video</h2>
          <button className="close-button" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="import-form">
          {submitError && <div data-testid="import-error" className="error-message">{submitError}</div>}

          <div className="form-field">
            <label htmlFor="youtubeUrl">YouTube URL</label>
            <input
              id="youtubeUrl"
              data-testid="youtube-url-input"
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={isSubmitting}
              required
            />
            {isLoadingPreview && <p className="loading-text">Loading preview...</p>}
            {previewError && <p data-testid="url-preview-error" className="error-text">{previewError}</p>}
          </div>

          {preview && (
            <div data-testid="preview-container" className="preview-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.thumbnail_url} alt={preview.title} className="preview-image" />
              <div className="preview-text">
                <p className="preview-title">{preview.title}</p>
                <p className="preview-author">by {preview.author_name}</p>
              </div>
            </div>
          )}

          <div className="form-field">
            <label htmlFor="transcript">Transcript File</label>
            <input
              id="transcript"
              data-testid="transcript-input"
              type="file"
              accept=".srt,.vtt,.txt"
              onChange={(e) => setTranscriptFile(e.target.files?.[0] || null)}
              disabled={isSubmitting}
              required
            />
            {transcriptFile && <p className="file-name">{transcriptFile.name}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="tags">Tags (comma-separated)</label>
            <input
              id="tags"
              data-testid="tags-input"
              type="text"
              placeholder="e.g., spanish, beginner, news"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button data-testid="submit-import-button" type="submit" disabled={!canSubmit}>
              {isSubmitting ? 'Importing...' : 'Import Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
