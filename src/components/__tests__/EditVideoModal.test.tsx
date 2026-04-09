import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EditVideoModal from '../EditVideoModal'
import { VideoCardProps } from '../VideoCard'

const mockVideo: VideoCardProps = {
  id: 'video-1',
  title: 'Test Video Title',
  author_name: 'Test Author',
  thumbnail_url: 'https://example.com/thumb.jpg',
  youtube_url: 'https://www.youtube.com/watch?v=abc123',
  tags: ['spanish', 'beginner'],
  created_at: '2026-04-09T12:00:00Z',
}

describe('EditVideoModal', () => {
  it('returns null when video is null', () => {
    const { container } = render(
      <EditVideoModal video={null} onClose={jest.fn()} onSave={jest.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders existing tags as pills', () => {
    render(<EditVideoModal video={mockVideo} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByText('spanish')).toBeInTheDocument()
    expect(screen.getByText('beginner')).toBeInTheDocument()
    expect(screen.getByTestId('remove-tag-spanish')).toBeInTheDocument()
    expect(screen.getByTestId('remove-tag-beginner')).toBeInTheDocument()
  })

  it('removes a tag when x button is clicked', () => {
    render(<EditVideoModal video={mockVideo} onClose={jest.fn()} onSave={jest.fn()} />)
    fireEvent.click(screen.getByTestId('remove-tag-spanish'))
    expect(screen.queryByText('spanish')).not.toBeInTheDocument()
    expect(screen.getByText('beginner')).toBeInTheDocument()
  })

  it('adds a new tag when Enter is pressed', () => {
    render(<EditVideoModal video={mockVideo} onClose={jest.fn()} onSave={jest.fn()} />)
    const input = screen.getByLabelText('New tag')
    fireEvent.change(input, { target: { value: 'advanced' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('advanced')).toBeInTheDocument()
  })

  it('does not add duplicate tags (case-insensitive)', () => {
    render(<EditVideoModal video={mockVideo} onClose={jest.fn()} onSave={jest.fn()} />)
    const input = screen.getByLabelText('New tag')
    fireEvent.change(input, { target: { value: 'Spanish' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    const tags = screen.getAllByText(/spanish/i)
    expect(tags).toHaveLength(1)
  })

  it('shows selected transcript filename', () => {
    render(<EditVideoModal video={mockVideo} onClose={jest.fn()} onSave={jest.fn()} />)
    const fileInput = screen.getByLabelText('Transcript file')
    const file = new File(['content'], 'subtitles.srt', { type: 'text/plain' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    expect(screen.getByText('subtitles.srt')).toBeInTheDocument()
  })

  it('disables Save button when isSaving', async () => {
    let resolveFetch: (value: unknown) => void
    const hangingPromise = new Promise((resolve) => { resolveFetch = resolve })
    global.fetch = jest.fn().mockReturnValue(hangingPromise)

    render(<EditVideoModal video={mockVideo} onClose={jest.fn()} onSave={jest.fn()} />)
    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    })

    resolveFetch!({ ok: false, text: async () => 'error' })
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = jest.fn()
    render(<EditVideoModal video={mockVideo} onClose={onClose} onSave={jest.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
