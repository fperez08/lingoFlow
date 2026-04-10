import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query'

export function useVideoMutations(): {
  deleteVideo: UseMutationResult<void, Error, string>
  refreshVideos: () => void
} {
  const queryClient = useQueryClient()

  const deleteVideo = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/videos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete video')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    },
  })

  const refreshVideos = () => queryClient.invalidateQueries({ queryKey: ['videos'] })

  return { deleteVideo, refreshVideos }
}
