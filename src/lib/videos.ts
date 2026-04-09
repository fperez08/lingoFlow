import { getDb } from './db'

export interface Video {
  id: string
  youtube_url: string
  youtube_id: string
  title: string
  author_name: string
  thumbnail_url: string
  transcript_path: string
  transcript_format: string
  tags: string[]
  created_at: string
  updated_at: string
}

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

export function listVideos(): Video[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM videos ORDER BY created_at DESC').all() as VideoRow[]
  return rows.map(rowToVideo)
}

export function getVideoById(id: string): Video | undefined {
  const db = getDb()
  const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(id) as VideoRow | undefined
  return row ? rowToVideo(row) : undefined
}

export interface InsertVideoParams {
  id: string
  youtube_url: string
  youtube_id: string
  title: string
  author_name: string
  thumbnail_url: string
  transcript_path: string
  transcript_format: string
  tags: string[]
}

export function insertVideo(params: InsertVideoParams): Video {
  const db = getDb()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO videos (id, youtube_url, youtube_id, title, author_name, thumbnail_url, transcript_path, transcript_format, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    params.id, params.youtube_url, params.youtube_id, params.title,
    params.author_name, params.thumbnail_url, params.transcript_path,
    params.transcript_format, JSON.stringify(params.tags), now, now
  )
  return getVideoById(params.id)!
}
