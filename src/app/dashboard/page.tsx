'use client'

import { useState, useEffect } from 'react'
import ImportVideoModal from '@/components/ImportVideoModal'
import VideoCard, { VideoCardProps } from '@/components/VideoCard'

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [videos, setVideos] = useState<VideoCardProps[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/videos')
      .then((res) => res.json())
      .then((data) => {
        setVideos(Array.isArray(data) ? data : [])
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false))
  }, [])

  const handleImportSuccess = () => {
    setIsModalOpen(false)
    setLoading(true)
    fetch('/api/videos')
      .then((res) => res.json())
      .then((data) => {
        setVideos(Array.isArray(data) ? data : [])
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false))
  }

  return (
    <main className="dashboard-page">
      <h1>Dashboard</h1>
      <p>Welcome to lingoFlow! You have successfully registered.</p>
      <button onClick={() => setIsModalOpen(true)}>Import Video</button>
      <ImportVideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleImportSuccess}
      />
      {loading ? (
        <p data-testid="loading-indicator">Loading...</p>
      ) : videos.length === 0 ? (
        <p data-testid="empty-state">No videos imported yet</p>
      ) : (
        <div
          className="video-grid"
          data-testid="video-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          {videos.map((video) => (
            <VideoCard key={video.id} {...video} />
          ))}
        </div>
      )}
    </main>
  )
}
