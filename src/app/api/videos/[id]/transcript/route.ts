// @jest-environment node
import { NextResponse } from 'next/server'
import fs from 'fs'
import { videoStore } from '@/lib/server/composition'
import { parseTranscript } from '@/lib/parse-transcript'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const video = videoStore.getById(id)
    if (!video) {
      return new NextResponse('Not Found', { status: 404 })
    }
    if (!video.transcript_path) {
      return NextResponse.json({ cues: [] })
    }
    const content = fs.readFileSync(video.transcript_path, 'utf-8')
    const cues = parseTranscript(content, video.transcript_format)
    return NextResponse.json({ cues })
  } catch (error) {
    console.error('GET transcript error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
