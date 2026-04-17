'use client'

import { useState, useCallback } from 'react'

import { detectPastedTranscriptFormat } from '@/lib/detect-transcript-format'
import { ALLOWED_VIDEO_MIME_TYPES, MAX_VIDEO_SIZE_BYTES } from '@/lib/api-schemas'


interface UseImportVideoFormOptions {
  onSuccess: () => void
  onClose: () => void

}

export type TranscriptMode = 'upload' | 'paste'
export type ImportMode = 'local'

export interface UseImportVideoFormResult {
  importMode: ImportMode
  setImportMode: (mode: ImportMode) => void
  videoFile: File | null
  setVideoFile: (file: File | null) => void
  title: string
  setTitle: (title: string) => void
  author: string
  setAuthor: (author: string) => void
  transcriptFile: File | null
  setTranscriptFile: (file: File | null) => void
  transcriptMode: TranscriptMode
  setTranscriptMode: (mode: TranscriptMode) => void
  pastedTranscript: string
  setPastedTranscript: (text: string) => void
  tags: string
  setTags: (tags: string) => void
  isSubmitting: boolean
  submitError: string | null
  handleSubmit: (e: React.FormEvent) => Promise<void>
  canSubmit: boolean
}

export function useImportVideoForm({
  onSuccess,
  onClose,
}: UseImportVideoFormOptions): UseImportVideoFormResult {
  const [importMode, setImportModeState] = useState<ImportMode>('local')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null)
  const [transcriptMode, setTranscriptModeState] = useState<TranscriptMode>('upload')
  const [pastedTranscript, setPastedTranscript] = useState('')
  const [tags, setTags] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const setImportMode = useCallback((mode: ImportMode) => {
    setImportModeState(mode)
    setVideoFile(null)
    setTitle('')
    setAuthor('')
  }, [])

  const setTranscriptMode = useCallback((mode: TranscriptMode) => {
    setTranscriptModeState(mode)
    if (mode === 'paste') {
      setTranscriptFile(null)
    } else {
      setPastedTranscript('')
    }
  }, [])



  const hasTranscript = (() => {
    if (transcriptMode === 'paste') return pastedTranscript.replace(/\s/g, '').length >= 10
    return !!transcriptFile
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!videoFile) {
      setSubmitError('Video file is required')
      return
    }
    if (!ALLOWED_VIDEO_MIME_TYPES.includes(videoFile.type as typeof ALLOWED_VIDEO_MIME_TYPES[number])) {
      setSubmitError('Unsupported format. Please use MP4, WebM, or MOV.')
      return
    }
    if (videoFile.size > MAX_VIDEO_SIZE_BYTES) {
      setSubmitError('File is too large. Maximum size is 500 MB.')
      return
    }
    if (!title.trim()) {
      setSubmitError('Title is required')
      return
    }

    if (transcriptMode === 'paste') {
      if (pastedTranscript.replace(/\s/g, '').length < 10) {
        setSubmitError('Transcript must contain at least 10 non-whitespace characters')
        return
      }
    } else if (!transcriptFile) {
      setSubmitError('Transcript file is required')
      return
    }

    setIsSubmitting(true)

    try {
      const fileToSubmit = (() => {
        if (transcriptMode === 'paste') {
          const ext = detectPastedTranscriptFormat(pastedTranscript)
          return new File([pastedTranscript], `transcript.${ext}`, { type: 'text/plain' })
        }
        return transcriptFile!
      })()

      const formData = new FormData()
      formData.append('video', videoFile!)
      formData.append('title', title.trim())
      if (author.trim()) formData.append('author', author.trim())
      formData.append('transcript', fileToSubmit)
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
      setImportModeState('local')
      setVideoFile(null)
      setTitle('')
      setAuthor('')
      setTranscriptFile(null)
      setPastedTranscript('')
      setTranscriptModeState('upload')
      setTags('')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to import video')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = (() => {
    if (isSubmitting) return false
    if (!videoFile || !title.trim()) return false
    return hasTranscript
  })()

  return {
    importMode,
    setImportMode,
    videoFile,
    setVideoFile,
    title,
    setTitle,
    author,
    setAuthor,
    transcriptFile,
    setTranscriptFile,
    transcriptMode,
    setTranscriptMode,
    pastedTranscript,
    setPastedTranscript,
    tags,
    setTags,
    isSubmitting,
    submitError,
    handleSubmit,
    canSubmit,
  }
}

