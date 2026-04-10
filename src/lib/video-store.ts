import Database from 'better-sqlite3'
import { Video, InsertVideoParams, UpdateVideoParams } from './videos'

interface VideoRow {
  id: string
  youtube_url: string
  youtube_id: string
  title: string
  author_name: string
  thumbnail_url: string
  transcript_path: string
  transcript_format: string
  tags: string
  created_at: string
  updated_at: string
}

function rowToVideo(row: VideoRow): Video {
  return { ...row, tags: JSON.parse(row.tags) }
}

export interface VideoStore {
  list(): Video[]
  getById(id: string): Video | undefined
  insert(params: InsertVideoParams): Video
  update(id: string, params: UpdateVideoParams): Video | undefined
  delete(id: string): boolean
}

export class SqliteVideoStore implements VideoStore {
  constructor(private db: Database.Database) {}

  list(): Video[] {
    const rows = this.db.prepare('SELECT * FROM videos ORDER BY created_at DESC').all() as VideoRow[]
    return rows.map(rowToVideo)
  }

  getById(id: string): Video | undefined {
    const row = this.db.prepare('SELECT * FROM videos WHERE id = ?').get(id) as VideoRow | undefined
    return row ? rowToVideo(row) : undefined
  }

  insert(params: InsertVideoParams): Video {
    const now = new Date().toISOString()
    this.db.prepare(`
      INSERT INTO videos (id, youtube_url, youtube_id, title, author_name, thumbnail_url, transcript_path, transcript_format, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.id, params.youtube_url, params.youtube_id, params.title,
      params.author_name, params.thumbnail_url, params.transcript_path,
      params.transcript_format, JSON.stringify(params.tags), now, now
    )
    return this.getById(params.id)!
  }

  update(id: string, params: UpdateVideoParams): Video | undefined {
    const existing = this.getById(id)
    if (!existing) return undefined

    const updates: string[] = ['updated_at = ?']
    const values: unknown[] = [new Date().toISOString()]

    if (params.tags !== undefined) {
      updates.push('tags = ?')
      values.push(JSON.stringify(params.tags))
    }
    if (params.transcript_path !== undefined) {
      updates.push('transcript_path = ?')
      values.push(params.transcript_path)
    }
    if (params.transcript_format !== undefined) {
      updates.push('transcript_format = ?')
      values.push(params.transcript_format)
    }

    values.push(id)
    this.db.prepare(`UPDATE videos SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    return this.getById(id)
  }

  delete(id: string): boolean {
    const existing = this.getById(id)
    if (!existing) return false
    this.db.prepare('DELETE FROM videos WHERE id = ?').run(id)
    return true
  }
}
