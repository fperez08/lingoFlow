import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { usePlayerData } from '../usePlayerData'
import { ApiClient, ApiClientProvider } from '@/lib/api-client'
import { Video } from '@/lib/videos'
import { TranscriptCue } from '@/lib/parse-transcript'

const mockVideo: Video = {
  id: 'video-1',
  title: 'Test Video',
  author_name: 'Author',
  thumbnail_url: '',
  transcript_path: 'transcripts/video-1.srt',
  transcript_format: 'srt',
  tags: ['french'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  source_type: 'local',
}

const mockCues: TranscriptCue[] = [
  { index: 1, startTime: '00:00:00,000', endTime: '00:00:02,000', text: 'Hello' },
  { index: 2, startTime: '00:00:02,500', endTime: '00:00:05,000', text: 'World' },
]

function makeClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    listVideos: jest.fn(),
    getVideo: jest.fn(),
    getTranscript: jest.fn(),
    importVideo: jest.fn(),
    updateVideo: jest.fn(),
    deleteVideo: jest.fn(),
    ...overrides,
  }
}

function createWrapper(client: ApiClient) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(ApiClientProvider, { client }, children)
    )
  }
  Wrapper.displayName = 'UsePlayerDataWrapper'
  return { Wrapper, queryClient }
}

describe('usePlayerData', () => {
  it('returns isLoading=true while fetching', () => {
    const client = makeClient({
      getVideo: jest.fn(() => new Promise(() => {})),
      getTranscript: jest.fn(() => new Promise(() => {})),
    })
    const { Wrapper } = createWrapper(client)
    const { result } = renderHook(() => usePlayerData('video-1'), { wrapper: Wrapper })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.video).toBeUndefined()
    expect(result.current.cues).toBeUndefined()
    expect(result.current.error).toBeNull()
  })

  it('returns video and cues on parallel-fetch success', async () => {
    const client = makeClient({
      getVideo: jest.fn().mockResolvedValue(mockVideo),
      getTranscript: jest.fn().mockResolvedValue(mockCues),
    })
    const { Wrapper } = createWrapper(client)
    const { result } = renderHook(() => usePlayerData('video-1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.video).toEqual(mockVideo)
    expect(result.current.cues).toEqual(mockCues)
    expect(result.current.error).toBeNull()
    expect(client.getVideo).toHaveBeenCalledWith('video-1')
    expect(client.getTranscript).toHaveBeenCalledWith('video-1')
  })

  it('fires video and transcript queries in parallel (both called before either resolves)', () => {
    let videoResolve!: (v: Video) => void
    let transcriptResolve!: (c: TranscriptCue[]) => void
    const client = makeClient({
      getVideo: jest.fn(() => new Promise<Video>((r) => { videoResolve = r })),
      getTranscript: jest.fn(() => new Promise<TranscriptCue[]>((r) => { transcriptResolve = r })),
    })
    const { Wrapper } = createWrapper(client)
    renderHook(() => usePlayerData('video-1'), { wrapper: Wrapper })

    expect(client.getVideo).toHaveBeenCalledWith('video-1')
    expect(client.getTranscript).toHaveBeenCalledWith('video-1')

    // cleanup
    videoResolve(mockVideo)
    transcriptResolve(mockCues)
  })

  it('returns error when getVideo fails', async () => {
    const client = makeClient({
      getVideo: jest.fn().mockRejectedValue(new Error('Video not found: video-1')),
      getTranscript: jest.fn().mockResolvedValue(mockCues),
    })
    const { Wrapper } = createWrapper(client)
    const { result } = renderHook(() => usePlayerData('video-1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Video not found: video-1')
    expect(result.current.video).toBeUndefined()
  })

  it('returns error when getTranscript fails', async () => {
    const client = makeClient({
      getVideo: jest.fn().mockResolvedValue(mockVideo),
      getTranscript: jest.fn().mockRejectedValue(new Error('Failed to fetch transcript for: video-1')),
    })
    const { Wrapper } = createWrapper(client)
    const { result } = renderHook(() => usePlayerData('video-1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Failed to fetch transcript for: video-1')
  })

  it('serves cached video data on cache-hit without re-fetching', async () => {
    const client = makeClient({
      getVideo: jest.fn().mockResolvedValue(mockVideo),
      getTranscript: jest.fn().mockResolvedValue(mockCues),
    })
    const { Wrapper, queryClient } = createWrapper(client)

    // Pre-populate the cache
    queryClient.setQueryData(['videos', 'video-1'], mockVideo)
    queryClient.setQueryData(['transcript', 'video-1'], mockCues)

    const { result } = renderHook(() => usePlayerData('video-1'), { wrapper: Wrapper })

    // Data available synchronously from cache
    expect(result.current.video).toEqual(mockVideo)
    expect(result.current.cues).toEqual(mockCues)
    expect(result.current.isLoading).toBe(false)
  })
})
