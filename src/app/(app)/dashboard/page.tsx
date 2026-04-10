'use client'

import { useState } from 'react'
import ImportVideoModal from '@/components/ImportVideoModal'
import VideoCard, { VideoCardProps } from '@/components/VideoCard'
import DeleteVideoModal from '@/components/DeleteVideoModal'
import EditVideoModal from '@/components/EditVideoModal'
import { useVideos } from '@/hooks/useVideos'
import { useVideoMutations } from '@/hooks/useVideoMutations'
import { Video } from '@/lib/videos'

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Video | null>(null)
  const [editTarget, setEditTarget] = useState<Video | null>(null)

  const { data: videos = [], isLoading, error } = useVideos()
  const { deleteVideo, refreshVideos } = useVideoMutations()

  const handleImportSuccess = () => {
    setIsModalOpen(false)
    refreshVideos()
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteVideo.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  const handleEditSave = (_updatedVideo: VideoCardProps) => {
    setEditTarget(null)
    refreshVideos()
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
        isDeleting={deleteVideo.isPending}
      />
      <EditVideoModal
        video={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleEditSave}
      />
      {isLoading ? (
        <p data-testid="loading-indicator">Loading...</p>
      ) : error || videos.length === 0 ? (
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
