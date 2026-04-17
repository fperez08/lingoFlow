import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

export function ensureDataDirs(dataDir: string): void {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.mkdirSync(path.join(dataDir, 'transcripts'), { recursive: true })
  fs.mkdirSync(path.join(dataDir, 'videos'), { recursive: true })
}

export function openDb(dbPath: string): Database.Database {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  return db
}

export function initializeSchema(db: Database.Database): void {
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

  const addColumnIfMissing = (column: string, definition: string) => {
    try {
      db.exec(`ALTER TABLE videos ADD COLUMN ${column} ${definition}`)
    } catch {
      // Column already exists — ignore
    }
  }

  addColumnIfMissing('source_type', "TEXT NOT NULL DEFAULT 'youtube'")
  addColumnIfMissing('local_video_path', 'TEXT')
  addColumnIfMissing('local_video_filename', 'TEXT')
}
