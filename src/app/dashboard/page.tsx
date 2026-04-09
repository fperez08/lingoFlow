'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import ImportVideoModal from '@/components/ImportVideoModal'
import VideoCard from '@/components/VideoCard'
import { useVideos } from '@/hooks/useVideos'

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: videos, isLoading, error } = useVideos()

  const handleImportSuccess = () => {
    setIsModalOpen(false)
    queryClient.invalidateQueries({ queryKey: ['videos'] })
  }

  return (
    <main className="dashboard-page">
      <h1>Dashboard</h1>
      <button onClick={() => setIsModalOpen(true)}>Import Video</button>
      <ImportVideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {isLoading && <p>Loading videos...</p>}
      {error && <p className="error">Failed to load videos: {error.message}</p>}

      {videos && videos.length === 0 && (
        <div className="empty-state">
          <p>No videos yet — click Import to add your first one.</p>
        </div>
      )}

      {videos && videos.length > 0 && (
        <div className="videos-grid">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              id={video.id}
              title={video.title}
              author_name={video.author_name}
              thumbnail_url={video.thumbnail_url}
              youtube_url={video.youtube_url}
              tags={video.tags}
              created_at={video.created_at}
            />
          ))}
        </div>
      )}
    </main>
  )
}
