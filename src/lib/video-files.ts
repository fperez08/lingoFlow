import fs from 'fs'
import path from 'path'
import { getVideosDir } from '@/lib/data-dir'

export { getVideosDir }

export function buildVideoFilePath(videoId: string, ext: string): string {
  return path.join(getVideosDir(), `${videoId}.${ext}`)
}

export async function writeVideoFile(videoId: string, ext: string, buffer: Buffer): Promise<string> {
  const videosDir = getVideosDir()
  fs.mkdirSync(videosDir, { recursive: true })
  const filePath = buildVideoFilePath(videoId, ext)
  fs.writeFileSync(filePath, buffer)
  return filePath
}

export async function deleteVideoFile(filePath: string): Promise<void> {
  try {
    fs.unlinkSync(filePath)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
}
