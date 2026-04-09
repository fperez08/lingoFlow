import { NextResponse } from 'next/server'
import { listVideos } from '@/lib/videos'

export async function GET() {
  try {
    const videos = listVideos()
    return NextResponse.json(videos)
  } catch (error) {
    console.error('Videos API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
