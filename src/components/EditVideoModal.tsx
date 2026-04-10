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
    <div data-testid="edit-modal">
      <h2>Edit Video</h2>
      {error && <p data-testid="edit-error" role="alert">{error}</p>}

      <div>
        {tags.map((tag) => (
          <span key={tag} className="tag-pill">
            {tag}
            <button
              data-testid={`remove-tag-${tag}`}
              onClick={() => handleRemoveTag(tag)}
              aria-label={`Remove tag ${tag}`}
            >
              x
            </button>
          </span>
        ))}
      </div>

      <input
        data-testid="tag-input"
        type="text"
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        onKeyDown={handleTagKeyDown}
        placeholder="Add a tag and press Enter"
        aria-label="New tag"
      />

      <div>
        <label htmlFor="transcript-input">Transcript file</label>
        <input
          id="transcript-input"
          type="file"
          accept=".srt,.vtt,.txt"
          onChange={(e) => setTranscript(e.target.files?.[0] ?? null)}
        />
        {transcript && <span>{transcript.name}</span>}
      </div>

      <button onClick={onClose} aria-label="Close modal">
        ✕
      </button>
      <button onClick={onClose}>Cancel</button>
      <button data-testid="save-button" onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}
