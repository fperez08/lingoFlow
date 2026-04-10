import { render, screen } from '@testing-library/react'
import PlayerPage from '../page'

jest.mock('@/lib/server/composition', () => ({
  videoStore: { getById: jest.fn() },
}))

jest.mock('@/components/PlayerClient', () => {
  return function MockPlayerClient() {
    return <div data-testid="player-client" />
  }
})

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

import { videoStore } from '@/lib/server/composition'
import { notFound } from 'next/navigation'

const mockGetById = videoStore.getById as jest.Mock

const mockVideo = {
  id: 'video-1',
  youtube_url: 'https://youtube.com/watch?v=abc',
  youtube_id: 'abc',
  title: 'Test Video',
  author_name: 'Author',
  thumbnail_url: 'https://img.example.com/thumb.jpg',
  transcript_path: '/data/transcripts/video-1.srt',
  transcript_format: 'srt',
  tags: ['spanish'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('PlayerPage', () => {
  afterEach(() => jest.clearAllMocks())

  it('renders PlayerClient when video exists', async () => {
    mockGetById.mockReturnValue(mockVideo)
    const Page = await PlayerPage({ params: Promise.resolve({ id: 'video-1' }) })
    render(Page as React.ReactElement)
    expect(screen.getByTestId('player-client')).toBeInTheDocument()
  })

  it('calls notFound when video does not exist', async () => {
    mockGetById.mockReturnValue(undefined)
    await expect(
      PlayerPage({ params: Promise.resolve({ id: 'nonexistent' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })
})
