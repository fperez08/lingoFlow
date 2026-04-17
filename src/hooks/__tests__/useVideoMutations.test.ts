import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useVideoMutations } from '../useVideoMutations'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }

  Wrapper.displayName = 'QueryClientWrapper'
  return Wrapper
}

describe('useVideoMutations', () => {
  afterEach(() => jest.resetAllMocks())

  describe('deleteVideo', () => {
    it('calls DELETE /api/videos/:id and invalidates videos query on success', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      const { result } = renderHook(() => useVideoMutations(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.deleteVideo.mutate('v1')
      })

      await waitFor(() => expect(result.current.deleteVideo.isSuccess).toBe(true))

      expect(global.fetch).toHaveBeenCalledWith('/api/videos/v1', { method: 'DELETE' })
    })

    it('sets error state when DELETE response is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false })

      const { result } = renderHook(() => useVideoMutations(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.deleteVideo.mutate('v1')
      })

      await waitFor(() => expect(result.current.deleteVideo.isError).toBe(true))

      expect(result.current.deleteVideo.error?.message).toBe('Failed to delete video')
    })

    it('sets error state when fetch throws', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useVideoMutations(), { wrapper: createWrapper() })

      await act(async () => {
        result.current.deleteVideo.mutate('v1')
      })

      await waitFor(() => expect(result.current.deleteVideo.isError).toBe(true))

      expect(result.current.deleteVideo.error?.message).toBe('Network error')
    })
  })

  describe('refreshVideos', () => {
    it('invalidates the videos query key', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')
      function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(QueryClientProvider, { client: queryClient }, children)
      }

      Wrapper.displayName = 'RefreshVideosWrapper'
      const wrapper = Wrapper

      const { result } = renderHook(() => useVideoMutations(), { wrapper })

      act(() => {
        result.current.refreshVideos()
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['videos'] })
    })
  })
})
