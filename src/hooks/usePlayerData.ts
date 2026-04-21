import { useQueries } from '@tanstack/react-query'
import { useApiClient, queryKeys } from '@/lib/api-client'
import { Video } from '@/lib/videos'
import { TranscriptCue } from '@/lib/parse-transcript'

export interface PlayerData {
  video: Video | undefined
  cues: TranscriptCue[] | undefined
  isLoading: boolean
  error: Error | null
}

export function usePlayerData(id: string): PlayerData {
  const client = useApiClient()

  const [videoResult, transcriptResult] = useQueries({
    queries: [
      {
        queryKey: queryKeys.video(id),
        queryFn: () => client.getVideo(id),
      },
      {
        queryKey: queryKeys.transcript(id),
        queryFn: () => client.getTranscript(id),
      },
    ],
  })

  const isLoading = videoResult.isLoading || transcriptResult.isLoading
  const error = (videoResult.error ?? transcriptResult.error) as Error | null

  return {
    video: videoResult.data,
    cues: transcriptResult.data,
    isLoading,
    error,
  }
}
