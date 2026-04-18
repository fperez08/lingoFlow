import { openDb, initializeSchema } from '../db'
import { SqliteVideoStore } from '../video-store'
import { InsertVideoParams } from '../videos'

function makeParams(overrides: Partial<InsertVideoParams> = {}): InsertVideoParams {
  return {
    id: 'test-id-1',
    title: 'Test Video',
    author_name: 'Test Author',
    thumbnail_url: '',
    transcript_path: '/transcripts/abc.srt',
    transcript_format: 'srt',
    tags: ['tag1', 'tag2'],
    source_type: 'local',
    ...overrides,
  }
}

describe('SqliteVideoStore', () => {
  let store: SqliteVideoStore

  beforeEach(() => {
    const db = openDb(':memory:')
    initializeSchema(db)
    store = new SqliteVideoStore(db)
  })

  describe('insert', () => {
    it('inserts a video and returns it', () => {
      const video = store.insert(makeParams())
      expect(video.id).toBe('test-id-1')
      expect(video.title).toBe('Test Video')
      expect(video.tags).toEqual(['tag1', 'tag2'])
    })

    it('serializes tags as JSON in the database and deserializes on read', () => {
      const tags = ['typescript', 'sqlite', 'testing']
      const video = store.insert(makeParams({ id: 'tag-test', tags }))
      expect(video.tags).toEqual(tags)
    })

    it('stores empty tags array', () => {
      const video = store.insert(makeParams({ id: 'no-tags', tags: [] }))
      expect(video.tags).toEqual([])
    })

    it('supports legacy schema with NOT NULL youtube columns', () => {
      const db = openDb(':memory:')
      db.exec(`
        CREATE TABLE videos (
          id TEXT PRIMARY KEY,
          youtube_url TEXT NOT NULL,
          youtube_id TEXT NOT NULL,
          title TEXT NOT NULL,
          author_name TEXT NOT NULL,
          thumbnail_url TEXT NOT NULL,
          transcript_path TEXT NOT NULL,
          transcript_format TEXT NOT NULL,
          tags TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          source_type TEXT,
          local_video_path TEXT,
          local_video_filename TEXT,
          thumbnail_path TEXT
        )
      `)

      const legacyStore = new SqliteVideoStore(db)
      const video = legacyStore.insert(makeParams({ id: 'legacy-1' }))

      expect(video.id).toBe('legacy-1')
      expect(video.source_type).toBe('local')
    })
  })

  describe('list', () => {
    it('returns empty array when no videos exist', () => {
      expect(store.list()).toEqual([])
    })

    it('returns all inserted videos', () => {
      store.insert(makeParams({ id: 'v1' }))
      store.insert(makeParams({ id: 'v2' }))
      const videos = store.list()
      expect(videos).toHaveLength(2)
    })

    it('orders videos by created_at DESC', async () => {
      store.insert(makeParams({ id: 'first' }))
      await new Promise(r => setTimeout(r, 5))
      store.insert(makeParams({ id: 'second' }))
      const videos = store.list()
      expect(videos[0].id).toBe('second')
      expect(videos[1].id).toBe('first')
    })
  })

  describe('getById', () => {
    it('returns video when found', () => {
      store.insert(makeParams())
      const video = store.getById('test-id-1')
      expect(video).toBeDefined()
      expect(video!.id).toBe('test-id-1')
    })

    it('returns undefined when not found', () => {
      expect(store.getById('nonexistent')).toBeUndefined()
    })

    it('deserializes tags correctly on getById', () => {
      store.insert(makeParams({ tags: ['a', 'b', 'c'] }))
      const video = store.getById('test-id-1')
      expect(video!.tags).toEqual(['a', 'b', 'c'])
    })
  })

  describe('update', () => {
    it('returns undefined for non-existent id', () => {
      expect(store.update('nonexistent', { tags: ['x'] })).toBeUndefined()
    })

    it('updates tags', () => {
      store.insert(makeParams())
      const updated = store.update('test-id-1', { tags: ['new-tag'] })
      expect(updated!.tags).toEqual(['new-tag'])
    })

    it('updates transcript_path', () => {
      store.insert(makeParams())
      const updated = store.update('test-id-1', { transcript_path: '/new/path.srt' })
      expect(updated!.transcript_path).toBe('/new/path.srt')
    })

    it('updates transcript_format', () => {
      store.insert(makeParams())
      const updated = store.update('test-id-1', { transcript_format: 'srt' })
      expect(updated!.transcript_format).toBe('srt')
    })

    it('updates multiple fields at once', () => {
      store.insert(makeParams())
      const updated = store.update('test-id-1', {
        tags: ['updated'],
        transcript_path: '/updated/path.vtt',
        transcript_format: 'vtt',
      })
      expect(updated!.tags).toEqual(['updated'])
      expect(updated!.transcript_path).toBe('/updated/path.vtt')
      expect(updated!.transcript_format).toBe('vtt')
    })

    it('does not alter fields not included in params', () => {
      store.insert(makeParams({ title: 'Original Title' }))
      const updated = store.update('test-id-1', { tags: ['changed'] })
      expect(updated!.title).toBe('Original Title')
    })
  })

  describe('delete', () => {
    it('returns false when video does not exist', () => {
      expect(store.delete('nonexistent')).toBe(false)
    })

    it('returns true and removes the video', () => {
      store.insert(makeParams())
      expect(store.delete('test-id-1')).toBe(true)
      expect(store.getById('test-id-1')).toBeUndefined()
    })

    it('does not affect other videos', () => {
      store.insert(makeParams({ id: 'keep' }))
      store.insert(makeParams({ id: 'remove' }))
      store.delete('remove')
      expect(store.getById('keep')).toBeDefined()
      expect(store.list()).toHaveLength(1)
    })
  })
})
