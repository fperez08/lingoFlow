'use client'

import { useState, useEffect } from 'react'
import ImportVideoModal from '@/components/ImportVideoModal'
import VideoCard, { VideoCardProps } from '@/components/VideoCard'
import DeleteVideoModal from '@/components/DeleteVideoModal'
import EditVideoModal from '@/components/EditVideoModal'

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [videos, setVideos] = useState<VideoCardProps[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<VideoCardProps | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState<VideoCardProps | null>(null)

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

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/videos/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setVideos(prev => prev.filter(v => v.id !== deleteTarget.id))
        setDeleteTarget(null)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditSave = (updatedVideo: VideoCardProps) => {
    setVideos(prev => prev.map(v => v.id === updatedVideo.id ? updatedVideo : v))
    setEditTarget(null)
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
      <DeleteVideoModal
        video={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
      <EditVideoModal
        video={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleEditSave}
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
            <VideoCard key={video.id} {...video} onDelete={() => setDeleteTarget(video)} onEdit={() => setEditTarget(video)} />
          ))}
        </div>
      )}
    </main>
  )
}
