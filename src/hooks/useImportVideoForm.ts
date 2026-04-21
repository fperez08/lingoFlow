'use client'

import { useReducer, useCallback } from 'react'

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

export interface State {
  importMode: ImportMode
  videoFile: File | null
  title: string
  author: string
  transcriptFile: File | null
  transcriptMode: TranscriptMode
  pastedTranscript: string
  tags: string
  isSubmitting: boolean
  submitError: string | null
}

export type Action =
  | { type: 'SET_IMPORT_MODE';       mode: ImportMode }
  | { type: 'SET_VIDEO_FILE';        file: File | null }
  | { type: 'SET_TITLE';             title: string }
  | { type: 'SET_AUTHOR';            author: string }
  | { type: 'SET_TRANSCRIPT_MODE';   mode: TranscriptMode }
  | { type: 'SET_TRANSCRIPT_FILE';   file: File | null }
  | { type: 'SET_PASTED_TRANSCRIPT'; text: string }
  | { type: 'SET_TAGS';              tags: string }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR';          message: string }
  | { type: 'RESET' }

export const initialImportFormState: State = {
  importMode: 'local',
  videoFile: null,
  title: '',
  author: '',
  transcriptFile: null,
  transcriptMode: 'upload',
  pastedTranscript: '',
  tags: '',
  isSubmitting: false,
  submitError: null,
}

export function importFormReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_IMPORT_MODE':
      return { ...state, importMode: action.mode, videoFile: null, title: '', author: '' }
    case 'SET_VIDEO_FILE':
      return { ...state, videoFile: action.file }
    case 'SET_TITLE':
      return { ...state, title: action.title }
    case 'SET_AUTHOR':
      return { ...state, author: action.author }
    case 'SET_TRANSCRIPT_MODE':
      if (action.mode === 'paste') {
        return { ...state, transcriptMode: action.mode, transcriptFile: null }
      }
      return { ...state, transcriptMode: action.mode, pastedTranscript: '' }
    case 'SET_TRANSCRIPT_FILE':
      return { ...state, transcriptFile: action.file }
    case 'SET_PASTED_TRANSCRIPT':
      return { ...state, pastedTranscript: action.text }
    case 'SET_TAGS':
      return { ...state, tags: action.tags }
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true, submitError: null }
    case 'SUBMIT_SUCCESS':
      return { ...initialImportFormState }
    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: false, submitError: action.message }
    case 'RESET':
      return { ...initialImportFormState }
    default:
      return state
  }
}

export function useImportVideoForm({
  onSuccess,
  onClose,
}: UseImportVideoFormOptions): UseImportVideoFormResult {
  const [state, dispatch] = useReducer(importFormReducer, initialImportFormState)

  const {
    importMode, videoFile, title, author, transcriptFile,
    transcriptMode, pastedTranscript, tags, isSubmitting, submitError,
  } = state

  const setImportMode = useCallback((mode: ImportMode) => {
    dispatch({ type: 'SET_IMPORT_MODE', mode })
  }, [])

  const setVideoFile = useCallback((file: File | null) => {
    dispatch({ type: 'SET_VIDEO_FILE', file })
  }, [])

  const setTitle = useCallback((title: string) => {
    dispatch({ type: 'SET_TITLE', title })
  }, [])

  const setAuthor = useCallback((author: string) => {
    dispatch({ type: 'SET_AUTHOR', author })
  }, [])

  const setTranscriptMode = useCallback((mode: TranscriptMode) => {
    dispatch({ type: 'SET_TRANSCRIPT_MODE', mode })
  }, [])

  const setTranscriptFile = useCallback((file: File | null) => {
    dispatch({ type: 'SET_TRANSCRIPT_FILE', file })
  }, [])

  const setPastedTranscript = useCallback((text: string) => {
    dispatch({ type: 'SET_PASTED_TRANSCRIPT', text })
  }, [])

  const setTags = useCallback((tags: string) => {
    dispatch({ type: 'SET_TAGS', tags })
  }, [])

  const hasTranscript = (() => {
    if (transcriptMode === 'paste') return pastedTranscript.replace(/\s/g, '').length >= 10
    return !!transcriptFile
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    dispatch({ type: 'SUBMIT_START' })

    if (!videoFile) {
      dispatch({ type: 'SUBMIT_ERROR', message: 'Video file is required' })
      return
    }
    if (!ALLOWED_VIDEO_MIME_TYPES.includes(videoFile.type as typeof ALLOWED_VIDEO_MIME_TYPES[number])) {
      dispatch({ type: 'SUBMIT_ERROR', message: 'Unsupported format. Please use MP4, WebM, or MOV.' })
      return
    }
    if (videoFile.size > MAX_VIDEO_SIZE_BYTES) {
      dispatch({ type: 'SUBMIT_ERROR', message: 'File is too large. Maximum size is 500 MB.' })
      return
    }
    if (!title.trim()) {
      dispatch({ type: 'SUBMIT_ERROR', message: 'Title is required' })
      return
    }

    if (transcriptMode === 'paste') {
      if (pastedTranscript.replace(/\s/g, '').length < 10) {
        dispatch({ type: 'SUBMIT_ERROR', message: 'Transcript must contain at least 10 non-whitespace characters' })
        return
      }
    } else if (!transcriptFile) {
      dispatch({ type: 'SUBMIT_ERROR', message: 'Transcript file is required' })
      return
    }

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

      dispatch({ type: 'SUBMIT_SUCCESS' })
      onSuccess()
      onClose()
    } catch (error) {
      dispatch({ type: 'SUBMIT_ERROR', message: error instanceof Error ? error.message : 'Failed to import video' })
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

