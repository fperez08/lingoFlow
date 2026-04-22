import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { VocabEntry } from '@/lib/vocab-store'

export type { VocabEntry }

export function useVocabulary(): UseQueryResult<Map<string, VocabEntry>, Error> {
  return useQuery({
    queryKey: ['vocabulary'],
    queryFn: async () => {
      const res = await fetch('/api/vocabulary')
      if (!res.ok) throw new Error('Failed to fetch vocabulary')
      const entries = (await res.json()) as VocabEntry[]
      return new Map(entries.map((e) => [e.word.toLowerCase(), e]))
    },
  })
}

export function useUpdateWordStatus(): UseMutationResult<
  VocabEntry,
  Error,
  { word: string; status: VocabEntry['status'] }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ word, status }) => {
      const res = await fetch(`/api/vocabulary/${encodeURIComponent(word.toLowerCase())}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update word status')
      return res.json() as Promise<VocabEntry>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
    },
  })
}

export function useUpdateWordDefinition(): UseMutationResult<
  VocabEntry,
  Error,
  { word: string; definition: string }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ word, definition }) => {
      const res = await fetch(`/api/vocabulary/${encodeURIComponent(word.toLowerCase())}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ definition }),
      })
      if (!res.ok) throw new Error('Failed to save definition')
      return res.json() as Promise<VocabEntry>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
    },
  })
}
