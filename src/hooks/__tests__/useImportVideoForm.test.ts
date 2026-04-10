import { renderHook, act, waitFor } from '@testing-library/react'
import { useImportVideoForm } from '../useImportVideoForm'
import { YoutubeMetadataError } from '@/lib/youtube'

const mockMetadata = {
  title: 'Test Video',
  author_name: 'Test Author',
  thumbnail_url: 'https://example.com/thumb.jpg',
  youtube_id: 'dQw4w9WgXcQ',
}

function renderForm(overrides: Partial<Parameters<typeof useImportVideoForm>[0]> = {}) {
  const onSuccess = jest.fn()
  const onClose = jest.fn()
  const fetchMetadata = jest.fn()
  const { result } = renderHook(() =>
    useImportVideoForm({ onSuccess, onClose, fetchMetadata, ...overrides })
  )
  return { result, onSuccess, onClose, fetchMetadata }
}

describe('useImportVideoForm', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.resetAllMocks()
  })

  describe('initial state', () => {
    it('returns correct initial values', () => {
      const { result } = renderForm()

      expect(result.current.youtubeUrl).toBe('')
      expect(result.current.transcriptFile).toBeNull()
      expect(result.current.tags).toBe('')
      expect(result.current.preview).toBeNull()
      expect(result.current.previewError).toBeNull()
      expect(result.current.isLoadingPreview).toBe(false)
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.submitError).toBeNull()
      expect(result.current.canSubmit).toBe(false)
    })
  })

  describe('debounced preview fetch', () => {
    it('fetches preview after 500ms debounce on URL change', async () => {
      const fetchMetadata = jest.fn().mockResolvedValue(mockMetadata)
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn(), fetchMetadata })
      )

      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      })

      expect(fetchMetadata).not.toHaveBeenCalled()

      act(() => {
        jest.runAllTimers()
      })

      await waitFor(() => {
        expect(fetchMetadata).toHaveBeenCalledWith('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      })
    })

    it('sets preview on successful fetch', async () => {
      const fetchMetadata = jest.fn().mockResolvedValue(mockMetadata)
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn(), fetchMetadata })
      )

      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      })

      act(() => {
        jest.runAllTimers()
      })

      await waitFor(() => {
        expect(result.current.preview).toEqual({
          title: 'Test Video',
          author_name: 'Test Author',
          thumbnail_url: 'https://example.com/thumb.jpg',
        })
      })

      expect(result.current.previewError).toBeNull()
      expect(result.current.isLoadingPreview).toBe(false)
    })

    it('sets previewError on YoutubeMetadataError', async () => {
      const fetchMetadata = jest
        .fn()
        .mockRejectedValue(new YoutubeMetadataError('Invalid YouTube URL'))
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn(), fetchMetadata })
      )

      act(() => {
        result.current.setYoutubeUrl('https://example.com/not-youtube')
      })

      act(() => {
        jest.runAllTimers()
      })

      await waitFor(() => {
        expect(result.current.previewError).toBe('Invalid YouTube URL')
      })

      expect(result.current.preview).toBeNull()
    })

    it('sets generic error for unknown fetch errors', async () => {
      const fetchMetadata = jest.fn().mockRejectedValue(new Error('Network error'))
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn(), fetchMetadata })
      )

      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=abc')
      })

      act(() => {
        jest.runAllTimers()
      })

      await waitFor(() => {
        expect(result.current.previewError).toBe('Failed to load video preview')
      })
    })

    it('clears preview and error when URL is emptied', async () => {
      const fetchMetadata = jest.fn().mockResolvedValue(mockMetadata)
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn(), fetchMetadata })
      )

      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      })
      act(() => { jest.runAllTimers() })
      await waitFor(() => expect(result.current.preview).not.toBeNull())

      act(() => {
        result.current.setYoutubeUrl('')
      })
      act(() => { jest.runAllTimers() })

      await waitFor(() => {
        expect(result.current.preview).toBeNull()
        expect(result.current.previewError).toBeNull()
      })
    })

    it('debounces rapid URL changes (only calls fetch once)', async () => {
      const fetchMetadata = jest.fn().mockResolvedValue(mockMetadata)
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn(), fetchMetadata })
      )

      act(() => { result.current.setYoutubeUrl('h') })
      act(() => { result.current.setYoutubeUrl('ht') })
      act(() => { result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ') })
      act(() => { jest.runAllTimers() })

      await waitFor(() => expect(fetchMetadata).toHaveBeenCalledTimes(1))
    })
  })

  describe('canSubmit', () => {
    it('is false when youtubeUrl is empty', async () => {
      const fetchMetadata = jest.fn().mockResolvedValue(mockMetadata)
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn(), fetchMetadata })
      )

      act(() => {
        result.current.setTranscriptFile(new File(['content'], 'transcript.srt'))
      })

      expect(result.current.canSubmit).toBe(false)
    })

    it('is false when transcriptFile is null', async () => {
      const fetchMetadata = jest.fn().mockResolvedValue(mockMetadata)
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn(), fetchMetadata })
      )

      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      })
      act(() => { jest.runAllTimers() })
      await waitFor(() => expect(result.current.preview).not.toBeNull())

      expect(result.current.canSubmit).toBe(false)
    })

    it('is true when URL set, transcript file present, no errors, not loading', async () => {
      const fetchMetadata = jest.fn().mockResolvedValue(mockMetadata)
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn(), fetchMetadata })
      )

      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        result.current.setTranscriptFile(new File(['content'], 'transcript.srt'))
      })
      act(() => { jest.runAllTimers() })
      await waitFor(() => expect(result.current.preview).not.toBeNull())

      expect(result.current.canSubmit).toBe(true)
    })

    it('is false when previewError is set', async () => {
      const fetchMetadata = jest
        .fn()
        .mockRejectedValue(new YoutubeMetadataError('Invalid YouTube URL'))
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn(), fetchMetadata })
      )

      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=abc')
        result.current.setTranscriptFile(new File(['content'], 'transcript.srt'))
      })
      act(() => { jest.runAllTimers() })
      await waitFor(() => expect(result.current.previewError).not.toBeNull())

      expect(result.current.canSubmit).toBe(false)
    })
  })

  describe('handleSubmit', () => {
    const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent

    beforeEach(() => {
      mockEvent.preventDefault = jest.fn()
    })

    it('sets submitError when youtubeUrl is empty', async () => {
      const { result } = renderForm()

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      expect(result.current.submitError).toBe('YouTube URL is required')
    })

    it('sets submitError when transcriptFile is null', async () => {
      const { result } = renderForm()

      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      })

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      expect(result.current.submitError).toBe('Transcript file is required')
    })

    it('sets submitError when preview is loading', async () => {
      const fetchMetadata = jest.fn().mockImplementation(() => new Promise(() => {})) // never resolves
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn(), fetchMetadata })
      )

      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        result.current.setTranscriptFile(new File(['content'], 'transcript.srt'))
      })
      act(() => { jest.runAllTimers() })

      await waitFor(() => expect(result.current.isLoadingPreview).toBe(true))

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      expect(result.current.submitError).toBe(
        'Please wait for the video preview to finish loading'
      )
    })

    it('sets submitError when previewError is set', async () => {
      const fetchMetadata = jest
        .fn()
        .mockRejectedValue(new YoutubeMetadataError('Invalid YouTube URL'))
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn(), fetchMetadata })
      )

      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=abc')
        result.current.setTranscriptFile(new File(['content'], 'transcript.srt'))
      })
      act(() => { jest.runAllTimers() })
      await waitFor(() => expect(result.current.previewError).not.toBeNull())

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      expect(result.current.submitError).toBe(
        'Please fix the YouTube URL error before submitting'
      )
    })

    it('calls onSuccess and onClose on successful submission', async () => {
      const fetchMetadata = jest.fn().mockResolvedValue(mockMetadata)
      const onSuccess = jest.fn()
      const onClose = jest.fn()
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess, onClose, fetchMetadata })
      )

      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) })

      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        result.current.setTranscriptFile(new File(['content'], 'transcript.srt'))
      })
      act(() => { jest.runAllTimers() })
      await waitFor(() => expect(result.current.preview).not.toBeNull())

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      expect(onSuccess).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('resets form state after successful submission', async () => {
      const fetchMetadata = jest.fn().mockResolvedValue(mockMetadata)
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn(), fetchMetadata })
      )

      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) })

      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        result.current.setTranscriptFile(new File(['content'], 'transcript.srt'))
        result.current.setTags('spanish, beginner')
      })
      act(() => { jest.runAllTimers() })
      await waitFor(() => expect(result.current.preview).not.toBeNull())

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      expect(result.current.youtubeUrl).toBe('')
      expect(result.current.transcriptFile).toBeNull()
      expect(result.current.tags).toBe('')
      expect(result.current.preview).toBeNull()
    })

    it('sets submitError on failed API response', async () => {
      const fetchMetadata = jest.fn().mockResolvedValue(mockMetadata)
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn(), fetchMetadata })
      )

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Video already exists' }),
      })

      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        result.current.setTranscriptFile(new File(['content'], 'transcript.srt'))
      })
      act(() => { jest.runAllTimers() })
      await waitFor(() => expect(result.current.preview).not.toBeNull())

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      expect(result.current.submitError).toBe('Video already exists')
      expect(result.current.isSubmitting).toBe(false)
    })

    it('sends tags in FormData when provided', async () => {
      const fetchMetadata = jest.fn().mockResolvedValue(mockMetadata)
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn(), fetchMetadata })
      )

      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) })

      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        result.current.setTranscriptFile(new File(['content'], 'transcript.srt'))
        result.current.setTags('spanish, beginner')
      })
      act(() => { jest.runAllTimers() })
      await waitFor(() => expect(result.current.preview).not.toBeNull())

      await act(async () => {
        await result.current.handleSubmit(mockEvent)
      })

      const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0]
      const formData = fetchOptions.body as FormData
      expect(formData.get('tags')).toBe('spanish, beginner')
    })
  })
})
