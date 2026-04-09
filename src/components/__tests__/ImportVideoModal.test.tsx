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
    expect(screen.getByLabelText(/transcript file/i)).toBeInTheDocument()
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
})
