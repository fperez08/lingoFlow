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
import { SqliteVideoStore } from '@/lib/video-store'
import { VideoService } from '@/lib/video-service'
import { writeTranscript, deleteTranscript } from '@/lib/transcripts'

function createContainer(dataDir: string) {
  ensureDataDirs(dataDir)
  const db = openDb(path.join(dataDir, 'lingoflow.db'))
  initializeSchema(db)

  const store = new SqliteVideoStore(db)
  const transcriptStore = {
    write: (videoId: string, ext: string, buffer: Buffer) => writeTranscript(videoId, ext, buffer),
    delete: (filePath: string) => deleteTranscript(filePath),
  }
  const service = new VideoService(store, transcriptStore)

  return { videoStore: store, videoService: service }
}

const dataDir = process.env.LINGOFLOW_DATA_DIR ?? path.join(process.cwd(), '.lingoflow-data')
const { videoStore, videoService } = createContainer(dataDir)

export { videoStore, videoService }
