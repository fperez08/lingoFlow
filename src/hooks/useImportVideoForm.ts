'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  fetchYoutubeMetadata as defaultFetchMetadata,
  YoutubeMetadataError,
} from '@/lib/youtube'
import { detectPastedTranscriptFormat } from '@/lib/detect-transcript-format'

interface YoutubePreview {
  title: string
  author_name: string
  thumbnail_url: string
}

interface UseImportVideoFormOptions {
  onSuccess: () => void
  onClose: () => void
  fetchMetadata?: typeof defaultFetchMetadata
}

export type TranscriptMode = 'upload' | 'paste'

export interface UseImportVideoFormResult {
  youtubeUrl: string
  setYoutubeUrl: (url: string) => void
  transcriptFile: File | null
  setTranscriptFile: (file: File | null) => void
  transcriptMode: TranscriptMode
  setTranscriptMode: (mode: TranscriptMode) => void
  pastedTranscript: string
  setPastedTranscript: (text: string) => void
  tags: string
  setTags: (tags: string) => void
  preview: YoutubePreview | null
  previewError: string | null
  isLoadingPreview: boolean
  isSubmitting: boolean
  submitError: string | null
  handleSubmit: (e: React.FormEvent) => Promise<void>
  canSubmit: boolean
}

export function useImportVideoForm({
  onSuccess,
  onClose,
  fetchMetadata = defaultFetchMetadata,
}: UseImportVideoFormOptions): UseImportVideoFormResult {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null)
  const [transcriptMode, setTranscriptModeState] = useState<TranscriptMode>('upload')
  const [pastedTranscript, setPastedTranscript] = useState('')
  const [tags, setTags] = useState('')
  const [preview, setPreview] = useState<YoutubePreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const setTranscriptMode = useCallback((mode: TranscriptMode) => {
    setTranscriptModeState(mode)
    if (mode === 'paste') {
      setTranscriptFile(null)
    } else {
      setPastedTranscript('')
    }
  }, [])

  const fetchPreview = useCallback(
    async (url: string) => {
      if (!url.trim()) {
        setPreview(null)
        setPreviewError(null)
        return
      }

      setIsLoadingPreview(true)
      setPreviewError(null)
      try {
        const metadata = await fetchMetadata(url)
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
    },
    [fetchMetadata]
  )

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

    if (transcriptMode === 'paste') {
      if (pastedTranscript.replace(/\s/g, '').length < 10) {
        setSubmitError('Transcript must contain at least 10 non-whitespace characters')
        return
      }
    } else if (!transcriptFile) {
      setSubmitError('Transcript file is required')
      return
    }

    if (isLoadingPreview) {
      setSubmitError('Please wait for the video preview to finish loading')
      return
    }

    if (previewError) {
      setSubmitError('Please fix the YouTube URL error before submitting')
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
      formData.append('youtube_url', youtubeUrl)
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
      setYoutubeUrl('')
      setTranscriptFile(null)
      setPastedTranscript('')
      setTranscriptModeState('upload')
      setTags('')
      setPreview(null)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to import video')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = (() => {
    if (isSubmitting || isLoadingPreview || !!previewError || !youtubeUrl.trim()) return false
    if (transcriptMode === 'paste') return pastedTranscript.replace(/\s/g, '').length >= 10
    return !!transcriptFile
  })()

  return {
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
  }
}
