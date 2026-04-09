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
