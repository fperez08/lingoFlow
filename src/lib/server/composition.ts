/**
 * Composition root.
 *
 * createContainer(dataDir) — builds a fresh container wired to the given data directory.
 *   Pass ':memory:' to get an in-memory SQLite database (useful for tests).
 *
 * getContainer() — returns the process-lifetime singleton, lazily initialised on first call.
 *   Route handlers MUST call this inside the handler body, never at module scope.
 *
 * Example (production):
 *   LINGOFLOW_DATA_DIR=/var/data/lingoflow pnpm start
 *
 * Example (test):
 *   jest.spyOn(composition, 'getContainer').mockReturnValue(createContainer(':memory:'))
 */
import Database from 'better-sqlite3'
import { ensureDataDirs, openDb, initializeSchema } from '@/lib/db'
import { SqliteVideoStore } from '@/lib/video-store'
import { VideoService } from '@/lib/video-service'
import { writeTranscript, deleteTranscript } from '@/lib/transcripts'
import { SqliteVocabStore } from '@/lib/vocab-store'
import { getDataDir, getVideosDir } from '@/lib/data-dir'
import fs from 'fs'
import path from 'path'

export interface Container {
  videoStore: SqliteVideoStore
  videoService: VideoService
  vocabStore: SqliteVocabStore
}

export function createContainer(dataDir: string): Container {
  let db: Database.Database

  if (dataDir === ':memory:') {
    db = new Database(':memory:')
    db.pragma('journal_mode = WAL')
    initializeSchema(db)
  } else {
    ensureDataDirs(dataDir)
    db = openDb(path.join(dataDir, 'lingoflow.db'))
    initializeSchema(db)
  }

  const store = new SqliteVideoStore(db)
  const vocabStore = new SqliteVocabStore(db)

  const transcriptStore = {
    write: (videoId: string, ext: string, buffer: Buffer): string => {
      if (dataDir === ':memory:') return `:memory:/transcripts/${videoId}.${ext}`
      return writeTranscript(videoId, ext, buffer)
    },
    delete: (filePath: string): void => {
      if (dataDir === ':memory:') return
      deleteTranscript(filePath)
    },
  }

  const videoFileStore = {
    write: (videoId: string, ext: string, buffer: Buffer): string => {
      if (dataDir === ':memory:') return `:memory:/videos/${videoId}.${ext}`
      const videosDir = getVideosDir()
      fs.mkdirSync(videosDir, { recursive: true })
      const filePath = path.join(videosDir, `${videoId}.${ext}`)
      fs.writeFileSync(filePath, buffer)
      return filePath
    },
    delete: (filePath: string): void => {
      if (dataDir === ':memory:') return
      try {
        fs.unlinkSync(filePath)
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
      }
    },
  }

  const service = new VideoService(store, transcriptStore, videoFileStore)

  if (dataDir !== ':memory:') {
    // Lazy require to avoid loading thumbnails.ts (ffmpeg) at module import time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ThumbnailTask } = require('@/lib/tasks/thumbnail-task')
    service.registerPostImportTask(new ThumbnailTask(dataDir))
  }

  return { videoStore: store, videoService: service, vocabStore }
}

let _container: Container | null = null

export function getContainer(): Container {
  if (!_container) {
    _container = createContainer(getDataDir())
  }
  return _container
}
