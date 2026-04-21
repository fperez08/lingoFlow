import path from 'path'
import { PostImportTask } from '@/lib/video-service'
import { Video, UpdateVideoParams } from '@/lib/videos'
import { generateThumbnail } from '@/lib/thumbnails'
import { getThumbnailsDir } from '@/lib/data-dir'

export class ThumbnailTask implements PostImportTask {
  constructor(private dataDir: string) {}

  async run(video: Video): Promise<Partial<UpdateVideoParams>> {
    if (!video.local_video_path) return {}

    const thumbnailsDir = getThumbnailsDir()
    const outputPath = path.join(thumbnailsDir, `${video.id}.jpg`)
    const resolvedPath = await generateThumbnail(video.local_video_path, outputPath)

    if (resolvedPath) {
      return { thumbnail_path: resolvedPath }
    }
    return {}
  }
}
