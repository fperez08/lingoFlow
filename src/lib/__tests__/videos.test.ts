/**
 * @jest-environment node
 */

jest.mock('../db', () => {
  const actual = jest.requireActual('../db') as typeof import('../db')
  const db = actual.openDb(':memory:')
  actual.initializeSchema(db)
  return {
    ensureDataDirs: jest.fn(),
    openDb: jest.fn(() => db),
    initializeSchema: jest.fn(),
  }
})

import { openDb } from '../db'
import {
  listVideos,
  getVideoById,
  insertVideo as insertVideoFn,
  updateVideo,
  deleteVideo,
} from '../videos'

function getTestDb() {
  return (openDb as jest.Mock)()
}

describe('videos persistence module', () => {
  beforeEach(() => {
    getTestDb().exec('DELETE FROM videos')
  })

  function insertTestVideo(overrides: Record<string, unknown> = {}) {
    const db = getTestDb()
    const defaults = {
      id: 'v1',
      youtube_url: 'https://youtube.com/watch?v=abc',
      youtube_id: 'abc',
      title: 'Test Video',
      author_name: 'Test Author',
      thumbnail_url: 'https://example.com/thumb.jpg',
      transcript_path: '/transcripts/v1.srt',
      transcript_format: 'srt',
      tags: '["tag1","tag2"]',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    const row = { ...defaults, ...overrides }
    db.prepare(`
      INSERT INTO videos (id, youtube_url, youtube_id, title, author_name, thumbnail_url,
        transcript_path, transcript_format, tags, created_at, updated_at)
      VALUES (@id, @youtube_url, @youtube_id, @title, @author_name, @thumbnail_url,
        @transcript_path, @transcript_format, @tags, @created_at, @updated_at)
    `).run(row)
  }

  it('listVideos returns empty array when no records', () => {
    expect(listVideos()).toEqual([])
  })

  it('listVideos returns inserted records with tags parsed as arrays', () => {
    insertTestVideo()
    const videos = listVideos()
    expect(videos).toHaveLength(1)
    expect(videos[0].id).toBe('v1')
    expect(videos[0].title).toBe('Test Video')
    expect(videos[0].tags).toEqual(['tag1', 'tag2'])
  })

  it('listVideos returns records in descending created_at order', () => {
    insertTestVideo({ id: 'v1', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' })
    insertTestVideo({ id: 'v2', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z' })
    const videos = listVideos()
    expect(videos[0].id).toBe('v2')
    expect(videos[1].id).toBe('v1')
  })

  it('getVideoById returns the correct record', () => {
    insertTestVideo()
    const video = getVideoById('v1')
    expect(video).toBeDefined()
    expect(video!.id).toBe('v1')
    expect(video!.tags).toEqual(['tag1', 'tag2'])
  })

  it('getVideoById returns undefined for missing id', () => {
    expect(getVideoById('nonexistent')).toBeUndefined()
  })

  describe('updateVideo', () => {
    it('updates tags for an existing video', () => {
      insertTestVideo()
      const result = updateVideo('v1', { tags: ['updated', 'tags'] })
      expect(result).toBeDefined()
      expect(result!.tags).toEqual(['updated', 'tags'])
    })

    it('updates transcript_path for an existing video', () => {
      insertTestVideo()
      const result = updateVideo('v1', { transcript_path: '/new/path.vtt', transcript_format: 'vtt' })
      expect(result).toBeDefined()
      expect(result!.transcript_path).toBe('/new/path.vtt')
      expect(result!.transcript_format).toBe('vtt')
    })

    it('returns undefined for a non-existent id', () => {
      const result = updateVideo('nonexistent', { tags: ['x'] })
      expect(result).toBeUndefined()
    })

    it('changes updated_at after update', () => {
      insertTestVideo({ updated_at: '2026-01-01T00:00:00Z' })
      const result = updateVideo('v1', { tags: ['new'] })
      expect(result).toBeDefined()
      expect(result!.updated_at).not.toBe('2026-01-01T00:00:00Z')
    })
  })

  describe('insertVideo', () => {
    it('inserts a video and returns it with tags as array', () => {
      const params = {
        id: 'insert-test-id',
        youtube_url: 'https://www.youtube.com/watch?v=inserttest',
        youtube_id: 'inserttest',
        title: 'Insert Test Video',
        author_name: 'Insert Author',
        thumbnail_url: 'https://img.youtube.com/vi/inserttest/0.jpg',
        transcript_path: '/data/transcripts/insert-test-id.srt',
        transcript_format: 'srt',
        tags: ['insert', 'test'],
      }
      const video = insertVideoFn(params)
      expect(video.id).toBe('insert-test-id')
      expect(video.title).toBe('Insert Test Video')
      expect(video.tags).toEqual(['insert', 'test'])
      expect(video.transcript_format).toBe('srt')
    })

    it('makes the inserted video appear in listVideos()', () => {
      const params = {
        id: 'list-test-id',
        youtube_url: 'https://www.youtube.com/watch?v=listtest',
        youtube_id: 'listtest',
        title: 'List Test Video',
        author_name: 'List Author',
        thumbnail_url: 'https://img.youtube.com/vi/listtest/0.jpg',
        transcript_path: '/data/transcripts/list-test-id.srt',
        transcript_format: 'vtt',
        tags: [],
      }
      insertVideoFn(params)
      const videos = listVideos()
      const found = videos.find((v) => v.id === 'list-test-id')
      expect(found).toBeDefined()
      expect(found?.tags).toEqual([])
    })
  })

  describe('deleteVideo', () => {
    it('returns true and removes the video record', () => {
      insertTestVideo()
      const result = deleteVideo('v1')
      expect(result).toBe(true)
      expect(getVideoById('v1')).toBeUndefined()
    })

    it('returns false for a non-existent id', () => {
      expect(deleteVideo('nonexistent')).toBe(false)
    })

    it('deleted video no longer appears in listVideos()', () => {
      insertTestVideo()
      deleteVideo('v1')
      expect(listVideos()).toHaveLength(0)
    })
  })
})

