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

  describe('paste transcript mode', () => {
    it('defaults transcriptMode to upload', () => {
      const { result } = renderForm()
      expect(result.current.transcriptMode).toBe('upload')
      expect(result.current.pastedTranscript).toBe('')
    })

    it('setTranscriptMode to paste clears the transcript file', () => {
      const { result } = renderForm()
      act(() => {
        result.current.setTranscriptFile(new File(['content'], 'transcript.srt'))
      })
      act(() => {
        result.current.setTranscriptMode('paste')
      })
      expect(result.current.transcriptMode).toBe('paste')
      expect(result.current.transcriptFile).toBeNull()
    })

    it('setTranscriptMode to upload clears the pasted transcript', () => {
      const { result } = renderForm()
      act(() => {
        result.current.setTranscriptMode('paste')
        result.current.setPastedTranscript('This is a long enough transcript')
      })
      act(() => {
        result.current.setTranscriptMode('upload')
      })
      expect(result.current.transcriptMode).toBe('upload')
      expect(result.current.pastedTranscript).toBe('')
    })

    it('canSubmit is false with fewer than 10 non-whitespace chars in paste mode', async () => {
      const fetchMetadata = jest.fn().mockResolvedValue(mockMetadata)
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn(), fetchMetadata })
      )
      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        result.current.setTranscriptMode('paste')
        result.current.setPastedTranscript('short')
      })
      act(() => { jest.runAllTimers() })
      await waitFor(() => expect(result.current.preview).not.toBeNull())
      expect(result.current.canSubmit).toBe(false)
    })

    it('canSubmit is true with 10+ non-whitespace chars in paste mode', async () => {
      const fetchMetadata = jest.fn().mockResolvedValue(mockMetadata)
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess: jest.fn(), onClose: jest.fn(), fetchMetadata })
      )
      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        result.current.setTranscriptMode('paste')
        result.current.setPastedTranscript('This is a sufficiently long transcript text')
      })
      act(() => { jest.runAllTimers() })
      await waitFor(() => expect(result.current.preview).not.toBeNull())
      expect(result.current.canSubmit).toBe(true)
    })

    it('handleSubmit in paste mode creates a synthetic .txt File for plain text', async () => {
      const fetchMetadata = jest.fn().mockResolvedValue(mockMetadata)
      const onSuccess = jest.fn()
      const onClose = jest.fn()
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess, onClose, fetchMetadata })
      )
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) })

      const appendSpy = jest.spyOn(FormData.prototype, 'append')
      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        result.current.setTranscriptMode('paste')
        result.current.setPastedTranscript('This is a sufficiently long transcript text')
      })
      act(() => { jest.runAllTimers() })
      await waitFor(() => expect(result.current.preview).not.toBeNull())

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent)
      })

      expect(onSuccess).toHaveBeenCalledTimes(1)
      const transcriptCall = appendSpy.mock.calls.find(([key]) => key === 'transcript')
      expect(transcriptCall).toBeDefined()
      const file = transcriptCall![1] as File
      expect(file).toBeInstanceOf(File)
      expect(file.name).toBe('transcript.txt')
      expect(file.type).toBe('text/plain')

      appendSpy.mockRestore()
    })

    it('handleSubmit in paste mode creates a synthetic .vtt File for VTT content', async () => {
      const fetchMetadata = jest.fn().mockResolvedValue(mockMetadata)
      const onSuccess = jest.fn()
      const onClose = jest.fn()
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess, onClose, fetchMetadata })
      )
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) })

      const appendSpy = jest.spyOn(FormData.prototype, 'append')

      const vttContent = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello world'
      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        result.current.setTranscriptMode('paste')
        result.current.setPastedTranscript(vttContent)
      })
      act(() => { jest.runAllTimers() })
      await waitFor(() => expect(result.current.preview).not.toBeNull())

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent)
      })

      expect(onSuccess).toHaveBeenCalledTimes(1)
      const transcriptCall = appendSpy.mock.calls.find(([key]) => key === 'transcript')
      expect(transcriptCall).toBeDefined()
      const file = transcriptCall![1] as File
      expect(file).toBeInstanceOf(File)
      expect(file.name).toBe('transcript.vtt')

      appendSpy.mockRestore()
    })

    it('handleSubmit in paste mode creates a synthetic .srt File for SRT content', async () => {
      const fetchMetadata = jest.fn().mockResolvedValue(mockMetadata)
      const onSuccess = jest.fn()
      const onClose = jest.fn()
      const { result } = renderHook(() =>
        useImportVideoForm({ onSuccess, onClose, fetchMetadata })
      )
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) })

      const appendSpy = jest.spyOn(FormData.prototype, 'append')

      const srtContent = '1\n00:00:01,000 --> 00:00:02,000\nHello world\n\n2\n00:00:03,000 --> 00:00:04,000\nFoo bar'
      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        result.current.setTranscriptMode('paste')
        result.current.setPastedTranscript(srtContent)
      })
      act(() => { jest.runAllTimers() })
      await waitFor(() => expect(result.current.preview).not.toBeNull())

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent)
      })

      expect(onSuccess).toHaveBeenCalledTimes(1)
      const transcriptCall = appendSpy.mock.calls.find(([key]) => key === 'transcript')
      expect(transcriptCall).toBeDefined()
      const file = transcriptCall![1] as File
      expect(file).toBeInstanceOf(File)
      expect(file.name).toBe('transcript.srt')

      appendSpy.mockRestore()
    })

    it('handleSubmit in paste mode sets error when text is too short', async () => {
      const { result } = renderForm()
      act(() => {
        result.current.setYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        result.current.setTranscriptMode('paste')
        result.current.setPastedTranscript('hi')
      })
      await act(async () => {
        await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent)
      })
      expect(result.current.submitError).toBe('Transcript must contain at least 10 non-whitespace characters')
    })
  })

  describe('local upload video validation', () => {
    function makeTranscriptFile() {
      return new File(['1\n00:00:01,000 --> 00:00:02,000\nBonjour'], 'transcript.srt', { type: 'text/plain' })
    }

    it('sets submitError when video MIME type is not allowed', async () => {
      const { result } = renderForm()
      const invalidFile = new File(['data'], 'video.avi', { type: 'video/avi' })
      act(() => {
        result.current.setImportMode('local')
        result.current.setVideoFile(invalidFile)
        result.current.setTitle('Test')
        result.current.setTranscriptFile(makeTranscriptFile())
      })
      await act(async () => {
        await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent)
      })
      expect(result.current.submitError).toMatch(/Unsupported format/)
    })

    it('sets submitError when video file exceeds 500 MB', async () => {
      const { result } = renderForm()
      const oversizedFile = Object.defineProperty(
        new File(['x'], 'video.mp4', { type: 'video/mp4' }),
        'size',
        { value: 600_000_000 }
      )
      act(() => {
        result.current.setImportMode('local')
        result.current.setVideoFile(oversizedFile)
        result.current.setTitle('Test')
        result.current.setTranscriptFile(makeTranscriptFile())
      })
      await act(async () => {
        await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent)
      })
      expect(result.current.submitError).toMatch(/500 MB/)
    })

    it('clears submitError for a valid MP4 file and proceeds', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) })
      const { result, onSuccess } = renderForm()
      const videoContent = Buffer.from('fake-mp4')
      const validFile = Object.assign(
        new File([videoContent], 'video.mp4', { type: 'video/mp4' }),
        { arrayBuffer: async () => videoContent.buffer }
      )
      const transcriptContent = '1\n00:00:01,000 --> 00:00:02,000\nBonjour'
      const transcriptFile = Object.assign(
        new File([transcriptContent], 'transcript.srt', { type: 'text/plain' }),
        { arrayBuffer: async () => Buffer.from(transcriptContent).buffer }
      )
      act(() => {
        result.current.setImportMode('local')
        result.current.setVideoFile(validFile)
        result.current.setTitle('My Video')
        result.current.setTranscriptFile(transcriptFile)
      })
      await act(async () => {
        await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent)
      })
      expect(result.current.submitError).toBeNull()
      expect(onSuccess).toHaveBeenCalled()
    })
  })
})
