// @jest-environment node
import { NextResponse } from 'next/server'
import { getVideoById, deleteVideo, updateVideo, UpdateVideoParams } from '@/lib/videos'
import { writeTranscript, deleteTranscript } from '@/lib/transcripts'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const video = getVideoById(id)
    if (!video) {
      return new NextResponse('Not Found', { status: 404 })
    }
    if (video.transcript_path) {
      deleteTranscript(video.transcript_path)
    }
    deleteVideo(id)
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

    const existing = getVideoById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const updateParams: UpdateVideoParams = { tags }

    if (transcriptFile && transcriptFile.size > 0) {
      const ext = transcriptFile.name.split('.').pop()?.toLowerCase() || ''
      if (!['srt', 'vtt', 'txt'].includes(ext)) {
        return NextResponse.json({ error: 'Invalid file extension. Allowed: srt, vtt, txt' }, { status: 400 })
      }
      const buffer = Buffer.from(await transcriptFile.arrayBuffer())
      const newPath = writeTranscript(id + '-' + Date.now(), ext, buffer)
      if (existing.transcript_path) {
        deleteTranscript(existing.transcript_path)
      }
      updateParams.transcript_path = newPath
      updateParams.transcript_format = ext
    }

    const updated = updateVideo(id, updateParams)
    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error('PATCH video error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

