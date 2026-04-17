import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import fs from 'fs'
import path from 'path'

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
): Promise<string | null> {
  try {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .screenshots({
          timestamps: [1],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '640x?',
        })
    })
    return outputPath
  } catch {
    return null
  }
}

export async function deleteThumbnail(thumbnailPath: string): Promise<void> {
  try {
    fs.unlinkSync(thumbnailPath)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
}
