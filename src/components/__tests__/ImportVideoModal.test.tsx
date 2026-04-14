import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImportVideoModal from '../ImportVideoModal'
import * as youtubeLib from '@/lib/youtube'

jest.mock('@/lib/youtube', () => ({
  fetchYoutubeMetadata: jest.fn(),
  YoutubeMetadataError: Error,
}))

describe('ImportVideoModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ImportVideoModal isOpen={false} onClose={() => {}} onSuccess={() => {}} />
    )
    expect(container.querySelector('.modal-overlay')).not.toBeInTheDocument()
  })

  it('renders all form fields when isOpen is true', () => {
    render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)

    expect(screen.getByLabelText(/youtube url/i)).toBeInTheDocument()
    expect(screen.getByTestId('transcript-input')).toBeInTheDocument()
    expect(screen.getByLabelText(/tags/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import video/i })).toBeInTheDocument()
  })

  it('shows oEmbed preview after valid URL is entered', async () => {
    const mockMetadata = {
      title: 'Test Video',
      author_name: 'Test Author',
      thumbnail_url: 'https://example.com/thumb.jpg',
      youtube_id: 'dQw4w9WgXcQ',
    }

    jest.mocked(youtubeLib.fetchYoutubeMetadata).mockResolvedValue(mockMetadata)

    render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)

    const urlInput = screen.getByLabelText(/youtube url/i)
    fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })

    jest.runAllTimers()

    await waitFor(() => {
      expect(screen.getByText('Test Video')).toBeInTheDocument()
      expect(screen.getByTestId('preview-container')).toBeInTheDocument()
    })
  })

  it('shows inline error for invalid YouTube URL', async () => {
    jest.mocked(youtubeLib.fetchYoutubeMetadata).mockRejectedValue(new Error('Invalid YouTube URL'))

    render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)

    const urlInput = screen.getByLabelText(/youtube url/i)
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } })

    jest.runAllTimers()

    await waitFor(() => {
      expect(screen.getByText('Invalid YouTube URL')).toBeInTheDocument()
    })
  })

  it('disables submit button when no transcript file selected', async () => {
    const mockMetadata = {
      title: 'Test Video',
      author_name: 'Test Author',
      thumbnail_url: 'https://example.com/thumb.jpg',
      youtube_id: 'dQw4w9WgXcQ',
    }

    jest.mocked(youtubeLib.fetchYoutubeMetadata).mockResolvedValue(mockMetadata)

    render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)

    const urlInput = screen.getByLabelText(/youtube url/i)
    fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })

    jest.runAllTimers()

    await waitFor(() => {
      expect(screen.getByText('Test Video')).toBeInTheDocument()
    })

    const submitButton = screen.getByRole('button', { name: /import video/i })
    expect(submitButton).toBeDisabled()
  })

  it('closes modal on close button click', () => {
    const onClose = jest.fn()
    render(<ImportVideoModal isOpen={true} onClose={onClose} onSuccess={() => {}} />)

    const closeButton = screen.getByLabelText('Close modal')
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('closes modal on cancel button click', () => {
    const onClose = jest.fn()
    render(<ImportVideoModal isOpen={true} onClose={onClose} onSuccess={() => {}} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })

  describe('segmented transcript control', () => {
    it('shows Upload File and Paste Text buttons', () => {
      render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)
      expect(screen.getByTestId('transcript-mode-upload')).toBeInTheDocument()
      expect(screen.getByTestId('transcript-mode-paste')).toBeInTheDocument()
    })

    it('defaults to upload mode showing the file input', () => {
      render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)
      expect(screen.getByTestId('transcript-input')).toBeInTheDocument()
      expect(screen.queryByTestId('transcript-paste-input')).not.toBeInTheDocument()
    })

    it('switches to paste mode showing textarea and hiding file input', () => {
      render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)
      fireEvent.click(screen.getByTestId('transcript-mode-paste'))
      expect(screen.getByTestId('transcript-paste-input')).toBeInTheDocument()
      expect(screen.queryByTestId('transcript-input')).not.toBeInTheDocument()
    })

    it('switches back to upload mode showing file input and hiding textarea', () => {
      render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)
      fireEvent.click(screen.getByTestId('transcript-mode-paste'))
      fireEvent.click(screen.getByTestId('transcript-mode-upload'))
      expect(screen.getByTestId('transcript-input')).toBeInTheDocument()
      expect(screen.queryByTestId('transcript-paste-input')).not.toBeInTheDocument()
    })

    it('switching to paste clears the file selection (submit stays disabled)', async () => {
      const mockMetadata = {
        title: 'Test Video',
        author_name: 'Test Author',
        thumbnail_url: 'https://example.com/thumb.jpg',
        youtube_id: 'dQw4w9WgXcQ',
      }
      jest.mocked(youtubeLib.fetchYoutubeMetadata).mockResolvedValue(mockMetadata)

      render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)

      const urlInput = screen.getByTestId('youtube-url-input')
      fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })
      jest.runAllTimers()
      await waitFor(() => expect(screen.getByText('Test Video')).toBeInTheDocument())

      const fileInput = screen.getByTestId('transcript-input')
      const file = new File(['content'], 'transcript.srt', { type: 'text/plain' })
      fireEvent.change(fileInput, { target: { files: [file] } })

      // Switch to paste — file selection should be cleared, submit disabled
      fireEvent.click(screen.getByTestId('transcript-mode-paste'))
      expect(screen.getByRole('button', { name: /import video/i })).toBeDisabled()
    })

    it('switching to upload clears the pasted text (submit stays disabled)', async () => {
      const mockMetadata = {
        title: 'Test Video',
        author_name: 'Test Author',
        thumbnail_url: 'https://example.com/thumb.jpg',
        youtube_id: 'dQw4w9WgXcQ',
      }
      jest.mocked(youtubeLib.fetchYoutubeMetadata).mockResolvedValue(mockMetadata)

      render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)

      const urlInput = screen.getByTestId('youtube-url-input')
      fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })
      jest.runAllTimers()
      await waitFor(() => expect(screen.getByText('Test Video')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('transcript-mode-paste'))
      const textarea = screen.getByTestId('transcript-paste-input')
      fireEvent.change(textarea, { target: { value: 'This is a long enough transcript text' } })

      // Switch back to upload — pasted text cleared, submit disabled
      fireEvent.click(screen.getByTestId('transcript-mode-upload'))
      expect(screen.getByRole('button', { name: /import video/i })).toBeDisabled()
    })

    it('disables submit with fewer than 10 non-whitespace chars in paste mode', async () => {
      const mockMetadata = {
        title: 'Test Video',
        author_name: 'Test Author',
        thumbnail_url: 'https://example.com/thumb.jpg',
        youtube_id: 'dQw4w9WgXcQ',
      }
      jest.mocked(youtubeLib.fetchYoutubeMetadata).mockResolvedValue(mockMetadata)

      render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)

      const urlInput = screen.getByTestId('youtube-url-input')
      fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })
      jest.runAllTimers()
      await waitFor(() => expect(screen.getByText('Test Video')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('transcript-mode-paste'))
      fireEvent.change(screen.getByTestId('transcript-paste-input'), { target: { value: 'short' } })

      expect(screen.getByRole('button', { name: /import video/i })).toBeDisabled()
    })

    it('enables submit with 10+ non-whitespace chars in paste mode', async () => {
      const mockMetadata = {
        title: 'Test Video',
        author_name: 'Test Author',
        thumbnail_url: 'https://example.com/thumb.jpg',
        youtube_id: 'dQw4w9WgXcQ',
      }
      jest.mocked(youtubeLib.fetchYoutubeMetadata).mockResolvedValue(mockMetadata)

      render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)

      const urlInput = screen.getByTestId('youtube-url-input')
      fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })
      jest.runAllTimers()
      await waitFor(() => expect(screen.getByText('Test Video')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('transcript-mode-paste'))
      fireEvent.change(screen.getByTestId('transcript-paste-input'), {
        target: { value: 'This is a sufficiently long transcript' },
      })

      expect(screen.getByRole('button', { name: /import video/i })).not.toBeDisabled()
    })

    it('submitting in paste mode posts a synthetic .txt file', async () => {
      const mockMetadata = {
        title: 'Test Video',
        author_name: 'Test Author',
        thumbnail_url: 'https://example.com/thumb.jpg',
        youtube_id: 'dQw4w9WgXcQ',
      }
      jest.mocked(youtubeLib.fetchYoutubeMetadata).mockResolvedValue(mockMetadata)
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

      const onSuccess = jest.fn()
      const onClose = jest.fn()
      render(<ImportVideoModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />)

      const urlInput = screen.getByTestId('youtube-url-input')
      fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })
      jest.runAllTimers()
      await waitFor(() => expect(screen.getByText('Test Video')).toBeInTheDocument())

      fireEvent.click(screen.getByTestId('transcript-mode-paste'))
      fireEvent.change(screen.getByTestId('transcript-paste-input'), {
        target: { value: 'This is a sufficiently long transcript' },
      })

      fireEvent.click(screen.getByRole('button', { name: /import video/i }))

      await waitFor(() => expect(onSuccess).toHaveBeenCalled())

      const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0]
      const formData = fetchOptions.body as FormData
      const transcriptEntry = formData.get('transcript') as File
      expect(transcriptEntry).toBeInstanceOf(File)
      expect(transcriptEntry.name).toBe('transcript.txt')
      expect(transcriptEntry.type).toBe('text/plain')
    })
  })
})
