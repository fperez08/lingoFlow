import fs from 'fs'
import path from 'path'
import { getTranscriptsDir } from '@/lib/data-dir'

export { getTranscriptsDir }

export function buildTranscriptPath(videoId: string, ext: string): string {
  return path.join(getTranscriptsDir(), `${videoId}.${ext}`)
}

export function writeTranscript(videoId: string, ext: string, buffer: Buffer): string {
  const filePath = buildTranscriptPath(videoId, ext)
  fs.mkdirSync(getTranscriptsDir(), { recursive: true })
  fs.writeFileSync(filePath, buffer)
  return filePath
}

export function deleteTranscript(filePath: string): void {
  try {
    fs.unlinkSync(filePath)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
}
