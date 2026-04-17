import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

import { videoService, videoStore } from '@/lib/server/composition'
import { ImportLocalVideoRequestSchema } from '@/lib/api-schemas'
import { generateThumbnail } from '@/lib/thumbnails'

export const runtime = 'nodejs'

const dataDir = process.env.LINGOFLOW_DATA_DIR ?? path.join(process.cwd(), '.lingoflow-data')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Only local upload path is supported
    const videoField = formData.get('video')
    const isLocal = videoField instanceof File && videoField.size > 0

    if (!isLocal) {
      return NextResponse.json({ error: 'Only local video upload is supported' }, { status: 400 })
    }

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

    if (record.local_video_path) {
      const thumbnailPath = path.join(dataDir, 'thumbnails', `${videoId}.jpg`)
      void generateThumbnail(record.local_video_path, thumbnailPath)
        .then((resolvedPath) => {
          if (resolvedPath) {
            videoStore.update(videoId, { thumbnail_path: resolvedPath })
          }
        })
        .catch((thumbnailError) => {
          console.error(`Failed to generate thumbnail for video ${videoId}:`, thumbnailError)
        })
    }

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Import API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
