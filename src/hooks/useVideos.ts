import { useQuery, UseQueryResult } from '@tanstack/react-query'

export interface Video {
  id: string
  youtube_url: string
  youtube_id: string
  title: string
  author_name: string
  thumbnail_url: string
  transcript_path: string
  transcript_format: string
  tags: string[]
  created_at: string
  updated_at: string
}

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
