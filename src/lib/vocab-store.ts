import Database from 'better-sqlite3'

export interface VocabEntry {
  word: string
  status: 'new' | 'learning' | 'mastered'
  level?: string
  definition?: string
}

interface VocabRow {
  word: string
  status: string
  level: string | null
  definition: string | null
  created_at: string
  updated_at: string
}

function rowToEntry(row: VocabRow): VocabEntry {
  return {
    word: row.word,
    status: row.status as VocabEntry['status'],
    level: row.level ?? undefined,
    definition: row.definition ?? undefined,
  }
}

export interface VocabStore {
  getAll(): VocabEntry[]
  getByWord(word: string): VocabEntry | null
  upsert(word: string, status: VocabEntry['status'], level?: string, definition?: string): VocabEntry
}

export class SqliteVocabStore implements VocabStore {
  constructor(private db: Database.Database) {}

  getAll(): VocabEntry[] {
    const rows = this.db.prepare('SELECT * FROM vocabulary ORDER BY word ASC').all() as VocabRow[]
    return rows.map(rowToEntry)
  }

  getByWord(word: string): VocabEntry | null {
    const row = this.db.prepare('SELECT * FROM vocabulary WHERE word = ?').get(word) as VocabRow | undefined
    return row ? rowToEntry(row) : null
  }

  upsert(word: string, status: VocabEntry['status'], level?: string, definition?: string): VocabEntry {
    const now = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO vocabulary (word, status, level, definition, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(word) DO UPDATE SET
           status = excluded.status,
           level = excluded.level,
           definition = excluded.definition,
           updated_at = excluded.updated_at`
      )
      .run(word, status, level ?? null, definition ?? null, now, now)
    return this.getByWord(word)!
  }
}
