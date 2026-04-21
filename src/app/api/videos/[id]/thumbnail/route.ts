import fs from 'fs'
import { getContainer } from '@/lib/server/composition'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { videoStore } = getContainer()
  const video = videoStore.getById(id)

  if (!video?.thumbnail_path) {
    return new Response(null, { status: 404 })
  }

  try {
    const buf = fs.readFileSync(video.thumbnail_path)
    return new Response(buf, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}
