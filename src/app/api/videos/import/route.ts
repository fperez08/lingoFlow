import { NextRequest, NextResponse } from 'next/server'
import { fetchYoutubeMetadata } from '@/lib/youtube'
import { videoService } from '@/lib/server/composition'
import { ImportVideoRequestSchema, ImportLocalVideoRequestSchema } from '@/lib/api-schemas'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Detect local upload path: video field present and non-empty
    const videoField = formData.get('video')
    const isLocal = videoField instanceof File && videoField.size > 0

    if (isLocal) {
      const result = ImportLocalVideoRequestSchema.safeParse({
        video: formData.get('video'),
        title: formData.get('title'),
        author: formData.get('author'),
        transcript: formData.get('transcript'),
        tags: formData.get('tags'),
      })

      if (!result.success) {
        return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
      }

      const { video, title, author, transcript: transcriptFile, tags: tagsString } = result.data
      const videoId = crypto.randomUUID()
      const videoBuffer = Buffer.from(await video.arrayBuffer())
      const videoExt = video.name.split('.').pop()?.toLowerCase() || 'mp4'
      const transcriptBuffer = Buffer.from(await transcriptFile.arrayBuffer())
      const transcriptExt = transcriptFile.name.split('.').pop()?.toLowerCase() || ''
      const tags = tagsString.split(',').map((t) => t.trim()).filter((t) => t.length > 0)

      const record = await videoService.importLocalVideo({
        id: videoId,
        title,
        author_name: author ?? '',
        video_buffer: videoBuffer,
        video_ext: videoExt,
        video_filename: video.name,
        transcript_buffer: transcriptBuffer,
        transcript_ext: transcriptExt,
        tags,
        source_type: 'local',
      })

      return NextResponse.json(record, { status: 201 })
    }

    // YouTube import path (existing)
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

    const video = await videoService.importVideo({
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
