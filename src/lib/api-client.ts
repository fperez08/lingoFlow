'use client'

import React, { createContext, useContext, useState } from 'react'
import { Video } from '@/lib/videos'
import { TranscriptCue } from '@/lib/parse-transcript'

export interface ApiClient {
  listVideos(): Promise<Video[]>
  getVideo(id: string): Promise<Video>
  getTranscript(id: string): Promise<TranscriptCue[]>
  importVideo(form: FormData): Promise<Video>
  updateVideo(id: string, form: FormData): Promise<Video>
  deleteVideo(id: string): Promise<void>
}

export const queryKeys = {
  videos: () => ['videos'] as const,
  video: (id: string) => ['videos', id] as const,
  transcript: (id: string) => ['transcript', id] as const,
}

export class FetchApiClient implements ApiClient {
  async listVideos(): Promise<Video[]> {
    const res = await fetch('/api/videos')
    if (!res.ok) throw new Error('Failed to fetch videos')
    return res.json()
  }

  async getVideo(id: string): Promise<Video> {
    const res = await fetch(`/api/videos/${id}`)
    if (res.status === 404) throw new Error(`Video not found: ${id}`)
    if (!res.ok) throw new Error(`Failed to fetch video: ${id}`)
    return res.json()
  }

  async getTranscript(id: string): Promise<TranscriptCue[]> {
    const res = await fetch(`/api/videos/${id}/transcript`)
    if (!res.ok) throw new Error(`Failed to fetch transcript for: ${id}`)
    const data = await res.json()
    return data.cues ?? []
  }

  async importVideo(form: FormData): Promise<Video> {
    const res = await fetch('/api/videos/import', { method: 'POST', body: form })
    if (!res.ok) throw new Error('Failed to import video')
    return res.json()
  }

  async updateVideo(id: string, form: FormData): Promise<Video> {
    const res = await fetch(`/api/videos/${id}`, { method: 'PATCH', body: form })
    if (!res.ok) throw new Error(`Failed to update video: ${id}`)
    return res.json()
  }

  async deleteVideo(id: string): Promise<void> {
    const res = await fetch(`/api/videos/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Failed to delete video: ${id}`)
  }
}

const ApiClientContext = createContext<ApiClient | null>(null)

export function ApiClientProvider({
  client,
  children,
}: {
  client?: ApiClient
  children: React.ReactNode
}) {
  const [defaultClient] = useState<ApiClient>(() => new FetchApiClient())
  return React.createElement(ApiClientContext.Provider, { value: client ?? defaultClient }, children)
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext)
  if (!client) throw new Error('useApiClient must be used within ApiClientProvider')
  return client
}
