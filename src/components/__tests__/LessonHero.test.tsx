import { render, screen, fireEvent } from '@testing-library/react'
import LessonHero from '../LessonHero'
import { Video } from '@/lib/videos'

const mockVideo: Video = {
  id: 'video-1',
  youtube_url: 'https://www.youtube.com/watch?v=abc123',
  youtube_id: 'abc123',
  title: 'Test Video Title',
  author_name: 'Test Author',
  thumbnail_url: 'https://example.com/thumb.jpg',
  transcript_path: 'transcripts/video-1.srt',
  transcript_format: 'srt',
  tags: ['french', 'beginner'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('LessonHero', () => {
  it('renders the thumbnail image with maxresdefault URL', () => {
    render(<LessonHero video={mockVideo} onPlay={jest.fn()} />)
    const img = screen.getByTestId('hero-thumbnail')
    expect(img).toHaveAttribute(
      'src',
      'https://img.youtube.com/vi/abc123/maxresdefault.jpg'
    )
    expect(img).toHaveAttribute('alt', 'Test Video Title')
  })

  it('renders the video title', () => {
    render(<LessonHero video={mockVideo} onPlay={jest.fn()} />)
    expect(screen.getByText('Test Video Title')).toBeInTheDocument()
  })

  it('renders the author name', () => {
    render(<LessonHero video={mockVideo} onPlay={jest.fn()} />)
    expect(screen.getByText('Test Author')).toBeInTheDocument()
  })

  it('renders all tags', () => {
    render(<LessonHero video={mockVideo} onPlay={jest.fn()} />)
    expect(screen.getByText('french')).toBeInTheDocument()
    expect(screen.getByText('beginner')).toBeInTheDocument()
  })

  it('does not render tag chips when tags array is empty', () => {
    render(<LessonHero video={{ ...mockVideo, tags: [] }} onPlay={jest.fn()} />)
    expect(screen.queryByText('french')).not.toBeInTheDocument()
  })

  it('calls onPlay when the play button is clicked', () => {
    const onPlay = jest.fn()
    render(<LessonHero video={mockVideo} onPlay={onPlay} />)
    fireEvent.click(screen.getByTestId('play-button'))
    expect(onPlay).toHaveBeenCalledTimes(1)
  })

  it('calls onPlay when the hero area is clicked', () => {
    const onPlay = jest.fn()
    render(<LessonHero video={mockVideo} onPlay={onPlay} />)
    fireEvent.click(screen.getByTestId('hero-play-area'))
    expect(onPlay).toHaveBeenCalled()
  })

  it('falls back to hqdefault thumbnail on image error', () => {
    render(<LessonHero video={mockVideo} onPlay={jest.fn()} />)
    const img = screen.getByTestId('hero-thumbnail')
    fireEvent.error(img)
    expect(img).toHaveAttribute(
      'src',
      'https://img.youtube.com/vi/abc123/hqdefault.jpg'
    )
  })
})
