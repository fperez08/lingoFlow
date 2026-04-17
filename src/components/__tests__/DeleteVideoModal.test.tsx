import { render, screen, fireEvent } from '@testing-library/react'
import DeleteVideoModal from '../DeleteVideoModal'
import { VideoCardProps } from '../VideoCard'

const mockVideo: VideoCardProps = {
  id: 'video-1',
  title: 'Test Video Title',
  author_name: 'Test Author',
  thumbnail_url: 'https://example.com/thumb.jpg',

  tags: ['spanish', 'beginner'],
  created_at: '2026-04-09T12:00:00Z',
}

describe('DeleteVideoModal', () => {
  it('renders nothing when video is null', () => {
    const { container } = render(
      <DeleteVideoModal video={null} onClose={jest.fn()} onConfirm={jest.fn()} isDeleting={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders video title', () => {
    render(
      <DeleteVideoModal video={mockVideo} onClose={jest.fn()} onConfirm={jest.fn()} isDeleting={false} />
    )
    expect(screen.getByTestId('delete-modal')).toBeInTheDocument()
    expect(screen.getByText(/Test Video Title/)).toBeInTheDocument()
  })

  it('cancel button calls onClose', () => {
    const onClose = jest.fn()
    render(
      <DeleteVideoModal video={mockVideo} onClose={onClose} onConfirm={jest.fn()} isDeleting={false} />
    )
    fireEvent.click(screen.getByTestId('cancel-button'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('confirm button calls onConfirm', () => {
    const onConfirm = jest.fn()
    render(
      <DeleteVideoModal video={mockVideo} onClose={jest.fn()} onConfirm={onConfirm} isDeleting={false} />
    )
    fireEvent.click(screen.getByTestId('confirm-delete-button'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('Delete button is disabled and shows loading when isDeleting is true', () => {
    render(
      <DeleteVideoModal video={mockVideo} onClose={jest.fn()} onConfirm={jest.fn()} isDeleting={true} />
    )
    const btn = screen.getByTestId('confirm-delete-button')
    expect(btn).toBeDisabled()
    expect(btn).toHaveTextContent('Deleting...')
  })
})
