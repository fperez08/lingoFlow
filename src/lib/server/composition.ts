/**
 * Production composition root.
 *
 * Data directory is resolved from the LINGOFLOW_DATA_DIR environment variable.
 * If the variable is not set, it defaults to `.lingoflow-data` inside the
 * current working directory (process.cwd()).
 *
 * Example:
 *   LINGOFLOW_DATA_DIR=/var/data/lingoflow pnpm start
 */
import path from 'path'
import { ensureDataDirs, openDb, initializeSchema } from '@/lib/db'
import { VideoStore, SqliteVideoStore } from '@/lib/video-store'
import { TranscriptStore, VideoService } from '@/lib/video-service'
import { writeTranscript, deleteTranscript } from '@/lib/transcripts'

let videoStore: VideoStore | null = null

export function getVideoStore(): VideoStore {
  if (!videoStore) {
    const dataDir = process.env.LINGOFLOW_DATA_DIR ?? path.join(process.cwd(), '.lingoflow-data')
    ensureDataDirs(dataDir)
    const db = openDb(path.join(dataDir, 'lingoflow.db'))
    initializeSchema(db)
    videoStore = new SqliteVideoStore(db)
  }
  return videoStore
}

export function getTranscriptStore(): TranscriptStore {
  return {
    write: (videoId, ext, buffer) => writeTranscript(videoId, ext, buffer),
    delete: (filePath) => deleteTranscript(filePath),
  }
}

export function getVideoService(): VideoService {
  return new VideoService(getVideoStore(), getTranscriptStore())
}
