import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Video {
  id: string
  user_id: string
  youtube_url: string
  youtube_id: string
  title: string
  author_name: string
  thumbnail_url: string
  transcript_path: string
  transcript_format: string
  tags: string[]
  created_at: string
}

export function useVideos(): UseQueryResult<Video[], Error> {
  return useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('videos').select('*').order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return data as Video[]
    },
  })
}
