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
import { ensureDataDirs, openDb, initializeSchema } from '@/lib/db'
import { SqliteVideoStore } from '@/lib/video-store'
import { VideoService } from '@/lib/video-service'
import { writeTranscript, deleteTranscript } from '@/lib/transcripts'
import { SqliteVocabStore } from '@/lib/vocab-store'
import { getDataDir, getDbPath, getVideosDir } from '@/lib/data-dir'
import fs from 'fs'
import path from 'path'

function createContainer() {
  const dataDir = getDataDir()
  ensureDataDirs(dataDir)
  const db = openDb(getDbPath())
  initializeSchema(db)

  const store = new SqliteVideoStore(db)
  const vocabStore = new SqliteVocabStore(db)
  const transcriptStore = {
    write: (videoId: string, ext: string, buffer: Buffer) => writeTranscript(videoId, ext, buffer),
    delete: (filePath: string) => deleteTranscript(filePath),
  }
  const videoFileStore = {
    write: (videoId: string, ext: string, buffer: Buffer): string => {
      const videosDir = getVideosDir()
      fs.mkdirSync(videosDir, { recursive: true })
      const filePath = path.join(videosDir, `${videoId}.${ext}`)
      fs.writeFileSync(filePath, buffer)
      return filePath
    },
    delete: (filePath: string): void => {
      try {
        fs.unlinkSync(filePath)
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
      }
    },
  }
  const service = new VideoService(store, transcriptStore, videoFileStore)

  return { videoStore: store, videoService: service, vocabStore }
}

const { videoStore, videoService, vocabStore } = createContainer()

export { videoStore, videoService, vocabStore }
