import { NextRequest, NextResponse } from 'next/server'
import { fetchYoutubeMetadata } from '@/lib/youtube'
import { writeTranscript } from '@/lib/transcripts'
import { insertVideo } from '@/lib/videos'

export const ALLOWED_EXTENSIONS = ['srt', 'vtt', 'txt'] as const
export type AllowedExtension = typeof ALLOWED_EXTENSIONS[number]

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const youtubeUrlEntry = formData.get('youtube_url')
    const transcriptEntry = formData.get('transcript')
    const tagsEntry = formData.get('tags')

    if (typeof youtubeUrlEntry !== 'string' || youtubeUrlEntry.trim() === '' || !(transcriptEntry instanceof File)) {
      return NextResponse.json({ error: 'Missing required fields: youtube_url and transcript' }, { status: 400 })
    }
    if (tagsEntry !== null && typeof tagsEntry !== 'string') {
      return NextResponse.json({ error: 'Invalid tags field' }, { status: 400 })
    }

    const youtubeUrl = youtubeUrlEntry.trim()
    const transcriptFile = transcriptEntry
    const tagsString = typeof tagsEntry === 'string' ? tagsEntry : ''

    const fileExtension = getFileExtension(transcriptFile.name)
    if (!ALLOWED_EXTENSIONS.includes(fileExtension as AllowedExtension)) {
      return NextResponse.json({ error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` }, { status: 400 })
    }

    let youtubeMetadata
    try {
      youtubeMetadata = await fetchYoutubeMetadata(youtubeUrl)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch YouTube metadata' }, { status: 422 })
    }

    const videoId = crypto.randomUUID()
    const fileBuffer = Buffer.from(await transcriptFile.arrayBuffer())
    const transcriptPath = writeTranscript(videoId, fileExtension, fileBuffer)

    const tags = tagsString.split(',').map((t) => t.trim()).filter((t) => t.length > 0)

    const video = insertVideo({
      id: videoId,
      youtube_url: youtubeUrl,
      youtube_id: youtubeMetadata.youtube_id,
      title: youtubeMetadata.title,
      author_name: youtubeMetadata.author_name,
      thumbnail_url: youtubeMetadata.thumbnail_url,
      transcript_path: transcriptPath,
      transcript_format: fileExtension,
      tags,
    })

    return NextResponse.json(video, { status: 201 })
  } catch (error) {
    console.error('Import API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
