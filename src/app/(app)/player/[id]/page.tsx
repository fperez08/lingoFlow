import PlayerLoader from '@/components/PlayerLoader'

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PlayerLoader id={id} />
}
