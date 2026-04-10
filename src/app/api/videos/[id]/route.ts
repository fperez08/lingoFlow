// @jest-environment node
import { NextResponse } from 'next/server'
import { getVideoStore, getVideoService } from '@/lib/server/composition'
import { UpdateVideoServiceParams } from '@/lib/video-service'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const video = getVideoStore().getById(id)
    if (!video) {
      return new NextResponse('Not Found', { status: 404 })
    }
    return NextResponse.json(video)
  } catch (error) {
    console.error('GET video error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const deleted = await getVideoService().deleteVideo(id)
    if (!deleted) {
      return new NextResponse('Not Found', { status: 404 })
    }
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('DELETE video error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const formData = await request.formData()
    const tagsRaw = formData.get('tags')
    const transcriptFile = formData.get('transcript') as File | null

    if (typeof tagsRaw !== 'string') {
      return NextResponse.json({ error: 'Invalid tags field' }, { status: 400 })
    }

    let tags: string[]
    try {
      tags = JSON.parse(tagsRaw)
      if (!Array.isArray(tags)) throw new Error()
    } catch {
      return NextResponse.json({ error: 'Tags must be a JSON array' }, { status: 400 })
    }

    const serviceParams: UpdateVideoServiceParams = { tags }

    if (transcriptFile && transcriptFile.size > 0) {
      const ext = transcriptFile.name.split('.').pop()?.toLowerCase() || ''
      if (!['srt', 'vtt', 'txt'].includes(ext)) {
        return NextResponse.json({ error: 'Invalid file extension. Allowed: srt, vtt, txt' }, { status: 400 })
      }
      serviceParams.transcript_ext = ext
      serviceParams.transcript_buffer = Buffer.from(await transcriptFile.arrayBuffer())
    }

    const updated = await getVideoService().updateVideo(id, serviceParams)
    if (!updated) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }
    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error('PATCH video error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

