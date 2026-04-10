import { NextRequest, NextResponse } from 'next/server'
import { fetchYoutubeMetadata } from '@/lib/youtube'
import { getVideoService } from '@/lib/server/composition'
import { ImportVideoRequestSchema } from '@/lib/api-schemas'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const result = ImportVideoRequestSchema.safeParse({
      youtube_url: formData.get('youtube_url'),
      transcript: formData.get('transcript'),
      tags: formData.get('tags'),
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { youtube_url: youtubeUrl, transcript: transcriptFile, tags: tagsString } = result.data

    let youtubeMetadata
    try {
      youtubeMetadata = await fetchYoutubeMetadata(youtubeUrl)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch YouTube metadata' }, { status: 422 })
    }

    const videoId = crypto.randomUUID()
    const fileBuffer = Buffer.from(await transcriptFile.arrayBuffer())
    const fileExtension = transcriptFile.name.split('.').pop()?.toLowerCase() || ''
    const tags = tagsString.split(',').map((t) => t.trim()).filter((t) => t.length > 0)

    const service = getVideoService()
    const video = await service.importVideo({
      id: videoId,
      youtube_url: youtubeUrl,
      youtube_id: youtubeMetadata.youtube_id,
      title: youtubeMetadata.title,
      author_name: youtubeMetadata.author_name,
      thumbnail_url: youtubeMetadata.thumbnail_url,
      transcript_ext: fileExtension,
      transcript_buffer: fileBuffer,
      tags,
    })

    return NextResponse.json(video, { status: 201 })
  } catch (error) {
    console.error('Import API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
