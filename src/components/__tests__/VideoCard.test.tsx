import { render, screen } from '@testing-library/react'
import VideoCard from '../VideoCard'

describe('VideoCard', () => {
  const mockVideo = {
    id: 'video-1',
    title: 'Test Video Title',
    author_name: 'Test Author',
    thumbnail_url: 'https://example.com/thumb.jpg',
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
})
