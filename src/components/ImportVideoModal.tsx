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
    transcriptMode,
    setTranscriptMode,
    pastedTranscript,
    setPastedTranscript,
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
    <div
      data-testid="import-modal"
      className="modal-overlay fixed inset-0 bg-black/40 backdrop-blur-[6px] z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest/90 dark:bg-slate-900/90 backdrop-blur-[24px] rounded-xl shadow-2xl border border-outline-variant/20 dark:border-slate-700/30 w-full max-w-lg p-8 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline text-2xl font-extrabold text-on-surface dark:text-slate-100">Import Video</h2>
          <button
            className="text-on-surface-variant hover:text-on-surface transition-colors rounded-full p-1"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {submitError && (
            <div data-testid="import-error" className="bg-error-container text-on-error-container px-4 py-3 rounded-xl text-sm">
              {submitError}
            </div>
          )}

          <div>
            <label htmlFor="youtubeUrl" className="text-sm font-bold text-on-surface-variant mb-1 block">
              YouTube URL
            </label>
            <input
              id="youtubeUrl"
              data-testid="youtube-url-input"
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full px-4 py-3 bg-surface-container-low dark:bg-slate-950/50 rounded-xl border border-outline-variant/30 dark:border-slate-700 text-on-surface dark:text-slate-100 placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
            />
            {isLoadingPreview && (
              <p className="text-sm text-on-surface-variant/70 mt-1">Loading preview...</p>
            )}
            {previewError && (
              <p data-testid="url-preview-error" className="text-sm text-error mt-1">{previewError}</p>
            )}
          </div>

          {preview && (
            <div data-testid="preview-container" className="flex gap-4 p-4 bg-surface-container-low rounded-xl border border-outline-variant/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.thumbnail_url}
                alt={preview.title}
                className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="font-headline font-bold text-on-surface text-sm leading-tight truncate">{preview.title}</p>
                <p className="text-xs text-on-surface-variant mt-1">by {preview.author_name}</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-bold text-on-surface-variant mb-1 block">
              Transcript
            </label>
            <div className="flex rounded-xl overflow-hidden border border-outline-variant/30 dark:border-slate-700 mb-3">
              <button
                type="button"
                data-testid="transcript-mode-upload"
                onClick={() => setTranscriptMode('upload')}
                disabled={isSubmitting}
                className={`flex-1 py-2 text-sm font-bold transition-colors ${
                  transcriptMode === 'upload'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface-container-low dark:bg-slate-950/50 text-on-surface-variant hover:bg-surface-container dark:hover:bg-slate-800'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                data-testid="transcript-mode-paste"
                onClick={() => setTranscriptMode('paste')}
                disabled={isSubmitting}
                className={`flex-1 py-2 text-sm font-bold transition-colors ${
                  transcriptMode === 'paste'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface-container-low dark:bg-slate-950/50 text-on-surface-variant hover:bg-surface-container dark:hover:bg-slate-800'
                }`}
              >
                Paste Text
              </button>
            </div>

            {transcriptMode === 'upload' ? (
              <>
                <input
                  id="transcript"
                  data-testid="transcript-input"
                  type="file"
                  accept=".srt,.vtt,.txt"
                  onChange={(e) => setTranscriptFile(e.target.files?.[0] || null)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 bg-surface-container-low dark:bg-slate-950/50 rounded-xl border border-outline-variant/30 dark:border-slate-700 text-on-surface dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary"
                />
                {transcriptFile && (
                  <p className="text-xs text-on-surface-variant mt-1">{transcriptFile.name}</p>
                )}
              </>
            ) : (
              <textarea
                id="transcript-paste"
                data-testid="transcript-paste-input"
                placeholder="Paste your transcript here..."
                value={pastedTranscript}
                onChange={(e) => setPastedTranscript(e.target.value)}
                disabled={isSubmitting}
                rows={6}
                className="w-full px-4 py-3 bg-surface-container-low dark:bg-slate-950/50 rounded-xl border border-outline-variant/30 dark:border-slate-700 text-on-surface dark:text-slate-100 placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 resize-none"
              />
            )}
          </div>

          <div>
            <label htmlFor="tags" className="text-sm font-bold text-on-surface-variant mb-1 block">
              Tags (comma-separated)
            </label>
            <input
              id="tags"
              data-testid="tags-input"
              type="text"
              placeholder="e.g., spanish, beginner, news"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-surface-container-low dark:bg-slate-950/50 rounded-xl border border-outline-variant/30 dark:border-slate-700 text-on-surface dark:text-slate-100 placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-400 rounded-xl font-bold hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              data-testid="submit-import-button"
              type="submit"
              disabled={!canSubmit}
              className="bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold px-6 py-3 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? 'Importing...' : 'Import Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
