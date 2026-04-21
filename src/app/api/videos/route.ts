import { NextResponse } from 'next/server'
import { getContainer } from '@/lib/server/composition'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { videoStore } = getContainer()
    const videos = videoStore.list()
    return NextResponse.json(videos)
  } catch (error) {
    console.error('Videos API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
