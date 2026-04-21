import { render, screen, fireEvent } from '@testing-library/react'
import LessonHero from '../LessonHero'
import { Video } from '@/lib/videos'

const mockVideo: Video = {
  id: 'video-1',

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

  it('play button has accessible name via aria-label', () => {
    render(<LessonHero video={mockVideo} onPlay={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument()
  })

  it('play button does not render visible Play text label', () => {
    render(<LessonHero video={mockVideo} onPlay={jest.fn()} />)
    const btn = screen.getByTestId('play-button')
    expect(btn).not.toHaveTextContent(/^Play$/)
  })

  it('play button contains an svg icon', () => {
    render(<LessonHero video={mockVideo} onPlay={jest.fn()} />)
    const btn = screen.getByTestId('play-button')
    expect(btn.querySelector('svg')).not.toBeNull()
  })

  it('play button is compact — uses rounded-full class for icon-control shape', () => {
    render(<LessonHero video={mockVideo} onPlay={jest.fn()} />)
    const btn = screen.getByTestId('play-button')
    expect(btn.className).toMatch(/rounded-full/)
  })
})
