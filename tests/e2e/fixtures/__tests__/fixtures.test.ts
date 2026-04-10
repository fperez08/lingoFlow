/**
 * @jest-environment node
 */
import fs from 'fs'
import path from 'path'

import {
  getIsolatedDataDir,
  setupIsolatedDb,
  teardownIsolatedDb,
  seedVideo,
  seedTranscript,
  setupYoutubeStub,
  teardownYoutubeStub,
  type FixtureContext,
} from '../index'

describe('getIsolatedDataDir()', () => {
  it('returns a unique path on each call', () => {
    const a = getIsolatedDataDir()
    const b = getIsolatedDataDir()
    expect(a).not.toBe(b)
  })

  it('incorporates the worker index when supplied', () => {
    const dir = getIsolatedDataDir(3)
    expect(dir).toContain('worker-3-')
  })

  it('returns a path inside os.tmpdir()', () => {
    const os = require('os')
    const dir = getIsolatedDataDir()
    expect(dir.startsWith(os.tmpdir())).toBe(true)
  })
})

describe('setupIsolatedDb() / teardownIsolatedDb()', () => {
  let ctx: FixtureContext

  beforeEach(() => {
    jest.resetModules()
    ctx = setupIsolatedDb()
  })

  afterEach(() => {
    teardownIsolatedDb(ctx)
  })

  it('creates the data directory on disk', () => {
    expect(fs.existsSync(ctx.dataDir)).toBe(true)
  })

  it('sets LINGOFLOW_DATA_DIR to the isolated dir', () => {
    expect(process.env.LINGOFLOW_DATA_DIR).toBe(ctx.dataDir)
  })

  it('creates the transcripts subdirectory', () => {
    expect(fs.existsSync(path.join(ctx.dataDir, 'transcripts'))).toBe(true)
  })

  it('creates the SQLite database file', () => {
    expect(fs.existsSync(path.join(ctx.dataDir, 'lingoflow.db'))).toBe(true)
  })

  it('initialises the videos table', () => {
    const { getDb } = require('../../../../src/lib/db')
    const db = getDb()
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='videos'")
      .get()
    expect(row).toBeDefined()
  })

  it('teardown removes the data directory', () => {
    teardownIsolatedDb(ctx)
    expect(fs.existsSync(ctx.dataDir)).toBe(false)
    // Re-create a fresh ctx so afterEach does not fail
    jest.resetModules()
    ctx = setupIsolatedDb()
  })

  it('teardown restores LINGOFLOW_DATA_DIR', () => {
    const before = ctx.originalEnv
    teardownIsolatedDb(ctx)
    expect(process.env.LINGOFLOW_DATA_DIR).toBe(before)
    // Re-create a fresh ctx so afterEach does not fail
    jest.resetModules()
    ctx = setupIsolatedDb()
  })

  it('two consecutive runs do not share state', () => {
    const { getDb } = require('../../../../src/lib/db')
    getDb()
      .prepare(
        `INSERT INTO videos (id,youtube_url,youtube_id,title,author_name,thumbnail_url,transcript_path,transcript_format,tags)
         VALUES ('v1','u','yi','t','a','th','tp','txt','[]')`
      )
      .run()

    teardownIsolatedDb(ctx)
    jest.resetModules()
    ctx = setupIsolatedDb()

    const { getDb: getDb2 } = require('../../../../src/lib/db')
    const count = getDb2()
      .prepare('SELECT COUNT(*) as c FROM videos')
      .get() as { c: number }
    expect(count.c).toBe(0)
  })
})

describe('seedVideo()', () => {
  let ctx: FixtureContext

  beforeEach(() => {
    jest.resetModules()
    ctx = setupIsolatedDb()
  })

  afterEach(() => {
    teardownIsolatedDb(ctx)
  })

  it('inserts a video and returns it', () => {
    const video = seedVideo({ title: 'My Video', youtube_id: 'abc123' })
    expect(video).toBeDefined()
    expect(video.title).toBe('My Video')
    expect(video.youtube_id).toBe('abc123')
  })

  it('works with all defaults (no params)', () => {
    const video = seedVideo()
    expect(video.id).toBeTruthy()
    expect(video.tags).toEqual([])
  })

  it('persists the record in the database', () => {
    const inserted = seedVideo({ title: 'Persisted' })
    const { getVideoById } = require('../../../../src/lib/videos')
    const fetched = getVideoById(inserted.id)
    expect(fetched).toBeDefined()
    expect(fetched!.title).toBe('Persisted')
  })

  it('accepts custom tags', () => {
    const video = seedVideo({ tags: ['tag1', 'tag2'] })
    expect(video.tags).toEqual(['tag1', 'tag2'])
  })
})

describe('seedTranscript()', () => {
  let ctx: FixtureContext

  beforeEach(() => {
    jest.resetModules()
    ctx = setupIsolatedDb()
  })

  afterEach(() => {
    teardownIsolatedDb(ctx)
  })

  it('writes a transcript file and returns its path', () => {
    const filePath = seedTranscript('video1', 'txt', 'hello world')
    expect(fs.existsSync(filePath)).toBe(true)
    expect(fs.readFileSync(filePath, 'utf8')).toBe('hello world')
  })

  it('places the file inside the isolated transcripts dir', () => {
    const filePath = seedTranscript('video2', 'vtt', 'subtitle content')
    expect(filePath.startsWith(path.join(ctx.dataDir, 'transcripts'))).toBe(true)
  })

  it('supports different file extensions', () => {
    const pathSrt = seedTranscript('v3', 'srt', 'srt content')
    const pathVtt = seedTranscript('v3', 'vtt', 'vtt content')
    expect(pathSrt.endsWith('.srt')).toBe(true)
    expect(pathVtt.endsWith('.vtt')).toBe(true)
  })
})

describe('setupYoutubeStub / teardownYoutubeStub', () => {
  it('sets E2E_STUB_YOUTUBE=true', () => {
    const ctx = setupYoutubeStub()
    expect(process.env.E2E_STUB_YOUTUBE).toBe('true')
    teardownYoutubeStub(ctx)
  })

  it('restores the previous undefined value on teardown', () => {
    delete process.env.E2E_STUB_YOUTUBE
    const ctx = setupYoutubeStub()
    teardownYoutubeStub(ctx)
    expect(process.env.E2E_STUB_YOUTUBE).toBeUndefined()
  })

  it('restores a prior truthy value on teardown', () => {
    process.env.E2E_STUB_YOUTUBE = 'false'
    const ctx = setupYoutubeStub()
    expect(process.env.E2E_STUB_YOUTUBE).toBe('true')
    teardownYoutubeStub(ctx)
    expect(process.env.E2E_STUB_YOUTUBE).toBe('false')
  })
})
