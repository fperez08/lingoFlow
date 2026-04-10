import { render, screen, fireEvent } from '@testing-library/react'
import VideoCard from '../VideoCard'

describe('VideoCard', () => {
  const mockVideo = {
    id: 'video-1',
    title: 'Test Video Title',
    author_name: 'Test Author',
    thumbnail_url: 'https://example.com/thumb.jpg',
    youtube_url: 'https://www.youtube.com/watch?v=abc123',
    tags: ['spanish', 'beginner'],
    created_at: '2026-04-09T12:00:00Z',
  }

  it('renders video title', () => {
    render(<VideoCard {...mockVideo} />)
    expect(screen.getByText('Test Video Title')).toBeInTheDocument()
  })

  it('renders author name', () => {
    render(<VideoCard {...mockVideo} />)
    expect(screen.getByText('Test Author')).toBeInTheDocument()
  })

  it('renders thumbnail with alt text', () => {
    render(<VideoCard {...mockVideo} />)
    const image = screen.getByAltText('Test Video Title')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/thumb.jpg')
  })

  it('renders all tags', () => {
    render(<VideoCard {...mockVideo} />)
    expect(screen.getByText('spanish')).toBeInTheDocument()
    expect(screen.getByText('beginner')).toBeInTheDocument()
  })

  it('renders formatted date', () => {
    render(<VideoCard {...mockVideo} />)
    expect(screen.getByText('Apr 9, 2026')).toBeInTheDocument()
  })

  it('renders without tags when tags array is empty', () => {
    render(<VideoCard {...mockVideo} tags={[]} />)
    expect(screen.queryByText('spanish')).not.toBeInTheDocument()
    expect(screen.queryByText('beginner')).not.toBeInTheDocument()
  })

  it('has data-testid for testing', () => {
    const { container } = render(<VideoCard {...mockVideo} />)
    expect(container.querySelector('[data-testid="video-card-video-1"]')).toBeInTheDocument()
  })

  it('links title and thumbnail to player page', () => {
    render(<VideoCard {...mockVideo} />)
    const links = screen.getAllByRole('link')
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', '/player/video-1')
    })
  })

  it('renders delete button when onDelete is provided', () => {
    render(<VideoCard {...mockVideo} onDelete={jest.fn()} />)
    expect(screen.getByTestId('delete-button')).toBeInTheDocument()
  })

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = jest.fn()
    render(<VideoCard {...mockVideo} onDelete={onDelete} />)
    fireEvent.click(screen.getByTestId('delete-button'))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('does not render delete button when onDelete is not provided', () => {
    render(<VideoCard {...mockVideo} />)
    expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument()
  })

  it('renders edit button when onEdit is provided', () => {
    render(<VideoCard {...mockVideo} onEdit={jest.fn()} />)
    expect(screen.getByTestId('edit-button')).toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = jest.fn()
    render(<VideoCard {...mockVideo} onEdit={onEdit} />)
    fireEvent.click(screen.getByTestId('edit-button'))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('does not render edit button when onEdit is not provided', () => {
    render(<VideoCard {...mockVideo} />)
    expect(screen.queryByTestId('edit-button')).not.toBeInTheDocument()
  })
})
