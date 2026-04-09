import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useVideos } from '../useVideos'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

describe('useVideos', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient()
    jest.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)

  it('fetches videos on mount', async () => {
    const mockVideos = [
      {
        id: 'video-1',
        user_id: 'user-1',
        youtube_url: 'https://www.youtube.com/watch?v=abc123',
        youtube_id: 'abc123',
        title: 'Test Video',
        author_name: 'Test Author',
        thumbnail_url: 'https://example.com/thumb.jpg',
        transcript_path: 'user-1/video-1.srt',
        transcript_format: 'srt',
        tags: ['spanish'],
        created_at: '2026-04-09T12:00:00Z',
      },
    ]

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: mockVideos, error: null }),
      }),
    })

    jest.mocked(supabase.from).mockImplementation(mockFrom)

    const { result } = renderHook(() => useVideos(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockVideos)
  })

  it('handles loading state', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                resolve({ data: [], error: null })
              }, 100)
            })
        ),
      }),
    })

    jest.mocked(supabase.from).mockImplementation(mockFrom)

    const { result } = renderHook(() => useVideos(), { wrapper })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('provides refetch function', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })

    jest.mocked(supabase.from).mockImplementation(mockFrom)

    const { result } = renderHook(() => useVideos(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(typeof result.current.refetch).toBe('function')
  })
})
