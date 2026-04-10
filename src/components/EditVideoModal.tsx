'use client'

import { useState, useEffect } from 'react'
import { VideoCardProps } from './VideoCard'

interface EditVideoModalProps {
  video: VideoCardProps | null
  onClose: () => void
  onSave: (updatedVideo: VideoCardProps) => void
}

export default function EditVideoModal({ video, onClose, onSave }: EditVideoModalProps) {
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [transcript, setTranscript] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (video) {
      setTags(video.tags)
      setTagInput('')
      setTranscript(null)
      setIsSaving(false)
      setError(null)
    }
  }, [video])

  if (!video) return null

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = tagInput.trim()
      if (trimmed && !tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
        setTags((prev) => [...prev, trimmed])
      }
      setTagInput('')
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('tags', JSON.stringify(tags))
      if (transcript) {
        formData.append('transcript', transcript)
      }
      const res = await fetch(`/api/videos/${video.id}`, {
        method: 'PATCH',
        body: formData,
      })
      if (!res.ok) {
        const text = await res.text()
        setError(text || 'Failed to save')
        return
      }
      const updatedVideo: VideoCardProps = await res.json()
      onSave(updatedVideo)
      onClose()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      data-testid="edit-modal"
      className="fixed inset-0 bg-black/40 backdrop-blur-[6px] z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest/90 backdrop-blur-[24px] rounded-xl shadow-2xl border border-outline-variant/20 w-full max-w-lg p-8 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline text-2xl font-extrabold text-on-surface">Edit Video</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-on-surface-variant hover:text-on-surface transition-colors rounded-full p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {error && (
          <div data-testid="edit-error" role="alert" className="bg-error-container text-on-error-container px-4 py-3 rounded-xl text-sm mb-5">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <span className="text-sm font-bold text-on-surface-variant mb-2 block">Tags</span>
            <div className="flex flex-wrap gap-2 p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 min-h-[48px]">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-sm font-medium">
                  {tag}
                  <button
                    data-testid={`remove-tag-${tag}`}
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="ml-1 hover:text-on-surface-variant transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              ))}
              <input
                data-testid="tag-input"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add a tag and press Enter"
                aria-label="New tag"
                className="bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-on-surface-variant/50 min-w-[140px] flex-1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="transcript-input" className="text-sm font-bold text-on-surface-variant mb-1 block">
              Transcript file
            </label>
            <input
              id="transcript-input"
              type="file"
              accept=".srt,.vtt,.txt"
              onChange={(e) => setTranscript(e.target.files?.[0] ?? null)}
              className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary"
            />
            {transcript && (
              <span className="text-xs text-on-surface-variant mt-1 block">{transcript.name}</span>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-surface-container-high text-on-surface-variant rounded-xl font-bold hover:bg-surface-container-highest transition-colors"
          >
            Cancel
          </button>
          <button
            data-testid="save-button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold px-6 py-3 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
