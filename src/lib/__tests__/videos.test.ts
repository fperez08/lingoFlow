/**
 * @jest-environment node
 */
import path from 'path'
import fs from 'fs'
import os from 'os'

describe('videos persistence module', () => {
  let tmpDir: string
  let originalEnv: string | undefined

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lingoflow-videos-test-'))
    originalEnv = process.env.LINGOFLOW_DATA_DIR
    process.env.LINGOFLOW_DATA_DIR = tmpDir

    jest.resetModules()
  })

  afterEach(() => {
    const { _resetDbInstance } = require('../db')
    _resetDbInstance()

    if (originalEnv === undefined) {
      delete process.env.LINGOFLOW_DATA_DIR
    } else {
      process.env.LINGOFLOW_DATA_DIR = originalEnv
    }

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  function insertVideo(overrides: Record<string, unknown> = {}) {
    const { getDb } = require('../db')
    const db = getDb()
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
    const { listVideos } = require('../videos')
    expect(listVideos()).toEqual([])
  })

  it('listVideos returns inserted records with tags parsed as arrays', () => {
    insertVideo()
    const { listVideos } = require('../videos')
    const videos = listVideos()
    expect(videos).toHaveLength(1)
    expect(videos[0].id).toBe('v1')
    expect(videos[0].title).toBe('Test Video')
    expect(videos[0].tags).toEqual(['tag1', 'tag2'])
  })

  it('listVideos returns records in descending created_at order', () => {
    insertVideo({ id: 'v1', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' })
    insertVideo({ id: 'v2', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z' })
    const { listVideos } = require('../videos')
    const videos = listVideos()
    expect(videos[0].id).toBe('v2')
    expect(videos[1].id).toBe('v1')
  })

  it('getVideoById returns the correct record', () => {
    insertVideo()
    const { getVideoById } = require('../videos')
    const video = getVideoById('v1')
    expect(video).toBeDefined()
    expect(video!.id).toBe('v1')
    expect(video!.tags).toEqual(['tag1', 'tag2'])
  })

  it('getVideoById returns undefined for missing id', () => {
    const { getVideoById } = require('../videos')
    expect(getVideoById('nonexistent')).toBeUndefined()
  })

  describe('insertVideo', () => {
    it('inserts a video and returns it with tags as array', () => {
      const { insertVideo } = require('../videos')
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
      const video = insertVideo(params)
      expect(video.id).toBe('insert-test-id')
      expect(video.title).toBe('Insert Test Video')
      expect(video.tags).toEqual(['insert', 'test'])
      expect(video.transcript_format).toBe('srt')
    })

    it('makes the inserted video appear in listVideos()', () => {
      const { insertVideo, listVideos } = require('../videos')
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
      insertVideo(params)
      const videos = listVideos()
      const found = videos.find((v: { id: string }) => v.id === 'list-test-id')
      expect(found).toBeDefined()
      expect(found?.tags).toEqual([])
    })
  })
})
