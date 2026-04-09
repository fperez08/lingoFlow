'use client'

import { useState, useCallback, useEffect } from 'react'
import { fetchYoutubeMetadata, YoutubeMetadataError } from '@/lib/youtube'

interface YoutubePreview {
  title: string
  author_name: string
  thumbnail_url: string
}

interface ImportVideoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ImportVideoModal({ isOpen, onClose, onSuccess }: ImportVideoModalProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null)
  const [tags, setTags] = useState('')
  const [preview, setPreview] = useState<YoutubePreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const fetchPreview = useCallback(async (url: string) => {
    if (!url.trim()) {
      setPreview(null)
      setPreviewError(null)
      return
    }

    setIsLoadingPreview(true)
    setPreviewError(null)
    try {
      const metadata = await fetchYoutubeMetadata(url)
      setPreview({
        title: metadata.title,
        author_name: metadata.author_name,
        thumbnail_url: metadata.thumbnail_url,
      })
    } catch (error) {
      setPreview(null)
      setPreviewError(
        error instanceof YoutubeMetadataError ? error.message : 'Failed to load video preview'
      )
    } finally {
      setIsLoadingPreview(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPreview(youtubeUrl)
    }, 500)

    return () => clearTimeout(timer)
  }, [youtubeUrl, fetchPreview])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!youtubeUrl.trim()) {
      setSubmitError('YouTube URL is required')
      return
    }

    if (!transcriptFile) {
      setSubmitError('Transcript file is required')
      return
    }

    if (previewError) {
      setSubmitError('Please fix the YouTube URL error before submitting')
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('youtube_url', youtubeUrl)
      formData.append('transcript', transcriptFile)
      if (tags.trim()) {
        formData.append('tags', tags)
      }

      const response = await fetch('/api/videos/import', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to import video')
      }

      onSuccess()
      onClose()
      setYoutubeUrl('')
      setTranscriptFile(null)
      setTags('')
      setPreview(null)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to import video')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  const canSubmit = !isSubmitting && !previewError && !!transcriptFile && youtubeUrl.trim()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Video</h2>
          <button className="close-button" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="import-form">
          {submitError && <div className="error-message">{submitError}</div>}

          <div className="form-field">
            <label htmlFor="youtubeUrl">YouTube URL</label>
            <input
              id="youtubeUrl"
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={isSubmitting}
              required
            />
            {isLoadingPreview && <p className="loading-text">Loading preview...</p>}
            {previewError && <p className="error-text">{previewError}</p>}
          </div>

          {preview && (
            <div className="preview-container">
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
              type="file"
              accept=".srt,.vtt,.txt"
              onChange={(e) => setTranscriptFile(e.currentTarget.files?.[0] || null)}
              disabled={isSubmitting}
              required
            />
            {transcriptFile && <p className="file-name">{transcriptFile.name}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="tags">Tags (comma-separated)</label>
            <input
              id="tags"
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
            <button type="submit" disabled={!canSubmit}>
              {isSubmitting ? 'Importing...' : 'Import Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
