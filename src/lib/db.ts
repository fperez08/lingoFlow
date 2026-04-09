import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

function getDataDir(): string {
  return process.env.LINGOFLOW_DATA_DIR ?? path.join(process.cwd(), '.lingoflow-data')
}

let dbInstance: Database.Database | null = null

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance

  const dataDir = getDataDir()
  const transcriptsDir = path.join(dataDir, 'transcripts')

  fs.mkdirSync(dataDir, { recursive: true })
  fs.mkdirSync(transcriptsDir, { recursive: true })

  const db = new Database(path.join(dataDir, 'lingoflow.db'))

  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      youtube_url TEXT NOT NULL,
      youtube_id TEXT NOT NULL,
      title TEXT NOT NULL,
      author_name TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      transcript_path TEXT NOT NULL,
      transcript_format TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  dbInstance = db
  return dbInstance
}

/** Reset the cached instance (for testing only) */
export function _resetDbInstance(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
