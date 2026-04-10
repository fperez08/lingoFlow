import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { Video } from '@/lib/videos'

export type { Video }

export function useVideos(): UseQueryResult<Video[], Error> {
  return useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const res = await fetch('/api/videos')
      if (!res.ok) throw new Error('Failed to fetch videos')
      return res.json() as Promise<Video[]>
    },
  })
}
