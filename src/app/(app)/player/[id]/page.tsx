import { notFound } from 'next/navigation'
import { videoStore } from '@/lib/server/composition'
import PlayerClient from '@/components/PlayerClient'

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const video = videoStore.getById(id)
  if (!video) {
    notFound()
  }
  return <PlayerClient video={video} />
}
