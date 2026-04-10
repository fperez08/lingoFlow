// @jest-environment node
import { NextResponse } from 'next/server'
import { videoStore, videoService } from '@/lib/server/composition'
import { UpdateVideoServiceParams } from '@/lib/video-service'
import { UpdateVideoRequestSchema } from '@/lib/api-schemas'

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
    const deleted = await videoService.deleteVideo(id)
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

    const result = UpdateVideoRequestSchema.safeParse({
      tags: formData.get('tags'),
      transcript: formData.get('transcript'),
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { tags, transcript: transcriptFile } = result.data
    const serviceParams: UpdateVideoServiceParams = { tags }

    if (transcriptFile && transcriptFile.size > 0) {
      serviceParams.transcript_ext = transcriptFile.name.split('.').pop()?.toLowerCase() || ''
      serviceParams.transcript_buffer = Buffer.from(await transcriptFile.arrayBuffer())
    }

    const updated = await videoService.updateVideo(id, serviceParams)
    if (!updated) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }
    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error('PATCH video error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

