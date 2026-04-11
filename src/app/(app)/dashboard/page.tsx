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
    <div>
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface mb-2 font-headline">My Library</h2>
          <p className="text-on-surface-variant text-lg max-w-xl">
            Curate your personalized linguistic environment. Import videos and start building your library.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          aria-label="Import Video"
          className="flex items-center gap-3 px-8 py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform whitespace-nowrap"
        >
          Import New Video
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-2">
        <button className="px-6 py-2 bg-primary text-white rounded-full text-sm font-bold">All Videos</button>
        <button className="px-6 py-2 bg-surface-container-high text-on-surface-variant rounded-full text-sm font-medium hover:bg-surface-container-highest transition-colors">Beginner</button>
        <button className="px-6 py-2 bg-surface-container-high text-on-surface-variant rounded-full text-sm font-medium hover:bg-surface-container-highest transition-colors">Intermediate</button>
        <button className="px-6 py-2 bg-surface-container-high text-on-surface-variant rounded-full text-sm font-medium hover:bg-surface-container-highest transition-colors">Advanced</button>
      </div>

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
        <p data-testid="loading-indicator" className="text-on-surface-variant text-lg">Loading...</p>
      ) : error || videos.length === 0 ? (
        <div
          data-testid="empty-state"
          onClick={() => setIsModalOpen(true)}
          className="aspect-video rounded-xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center gap-3 bg-surface-container-low hover:bg-surface-container-high cursor-pointer transition-colors"
        >
          <span className="text-4xl">☁️</span>
          <span className="text-sm font-bold text-outline">Import your first video</span>
          <span className="text-xs text-on-surface-variant">No videos imported yet</span>
        </div>
      ) : (
        <div
          className="video-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          data-testid="video-grid"
        >
          {videos.map((video) => (
            <VideoCard key={video.id} {...video} onDelete={() => setDeleteTarget(video)} onEdit={() => setEditTarget(video)} />
          ))}
        </div>
      )}
    </div>
  )
}
