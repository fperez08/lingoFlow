import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useVideos } from '../useVideos'

const mockVideos = [
  {
    id: 'v1',
    youtube_url: 'https://youtube.com/watch?v=1',
    youtube_id: '1',
    title: 'Video 1',
    author_name: 'Author 1',
    thumbnail_url: 'https://example.com/thumb1.jpg',
    transcript_path: 'path/v1.srt',
    transcript_format: 'srt',
    tags: ['tag1'],
    created_at: '2026-04-10T00:00:00Z',
    updated_at: '2026-04-10T00:00:00Z',
  },
]

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }

  Wrapper.displayName = 'UseVideosWrapper'
  return Wrapper
}

describe('useVideos', () => {
  afterEach(() => jest.resetAllMocks())

  it('calls /api/videos and returns video data', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockVideos,
    })

    const { result } = renderHook(() => useVideos(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(global.fetch).toHaveBeenCalledWith('/api/videos')
    expect(result.current.data).toEqual(mockVideos)
  })

  it('throws an error when the fetch response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Internal server error' }),
    })

    const { result } = renderHook(() => useVideos(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe('Failed to fetch videos')
  })
})
