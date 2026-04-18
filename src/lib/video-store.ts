import Database from 'better-sqlite3'
import { Video, InsertVideoParams, UpdateVideoParams } from './videos'

interface VideoRow {
  id: string

  title: string
  author_name: string
  thumbnail_url: string
  transcript_path: string
  transcript_format: string
  tags: string
  created_at: string
  updated_at: string
  source_type: string
  local_video_path: string | null
  local_video_filename: string | null
  thumbnail_path: string | null
}

interface VideoTableInfoRow {
  name: string
}

function rowToVideo(row: VideoRow): Video {
  return {
    ...row,
    tags: JSON.parse(row.tags) as string[],
    source_type: 'local',
    local_video_path: row.local_video_path ?? null,
    local_video_filename: row.local_video_filename ?? null,
    thumbnail_path: row.thumbnail_path ?? null,
  }
}

export interface VideoStore {
  list(): Video[]
  getById(id: string): Video | undefined
  insert(params: InsertVideoParams): Video
  update(id: string, params: UpdateVideoParams): Video | undefined
  delete(id: string): boolean
}

export class SqliteVideoStore implements VideoStore {
  private legacyYoutubeColumns: { hasYoutubeUrl: boolean; hasYoutubeId: boolean } | null = null

  constructor(private db: Database.Database) {}

  private getLegacyYoutubeColumns(): { hasYoutubeUrl: boolean; hasYoutubeId: boolean } {
    if (this.legacyYoutubeColumns) {
      return this.legacyYoutubeColumns
    }

    const tableInfo = this.db.prepare('PRAGMA table_info(videos)').all() as VideoTableInfoRow[]
    const columnNames = new Set(tableInfo.map((row) => row.name))

    this.legacyYoutubeColumns = {
      hasYoutubeUrl: columnNames.has('youtube_url'),
      hasYoutubeId: columnNames.has('youtube_id'),
    }

    return this.legacyYoutubeColumns
  }

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
    const { hasYoutubeUrl, hasYoutubeId } = this.getLegacyYoutubeColumns()
    const columns = [
      'id',
      'title',
      'author_name',
      'thumbnail_url',
      'transcript_path',
      'transcript_format',
      'tags',
      'created_at',
      'updated_at',
      'source_type',
      'local_video_path',
      'local_video_filename',
      'thumbnail_path',
    ]
    const values: unknown[] = [
      params.id,
      params.title,
      params.author_name,
      params.thumbnail_url,
      params.transcript_path,
      params.transcript_format,
      JSON.stringify(params.tags),
      now,
      now,
      params.source_type,
      params.local_video_path ?? null,
      params.local_video_filename ?? null,
      params.thumbnail_path ?? null,
    ]

    if (hasYoutubeUrl) {
      columns.push('youtube_url')
      values.push('')
    }

    if (hasYoutubeId) {
      columns.push('youtube_id')
      values.push('')
    }

    const placeholders = columns.map(() => '?').join(', ')
    this.db.prepare(`INSERT INTO videos (${columns.join(', ')}) VALUES (${placeholders})`).run(...values)
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
    if (params.thumbnail_path !== undefined) {
      updates.push('thumbnail_path = ?')
      values.push(params.thumbnail_path)
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
