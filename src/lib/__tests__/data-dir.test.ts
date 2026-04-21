/**
 * @jest-environment node
 */
import path from 'path'

describe('data-dir module', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env.LINGOFLOW_DATA_DIR
    jest.resetModules()
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.LINGOFLOW_DATA_DIR
    } else {
      process.env.LINGOFLOW_DATA_DIR = originalEnv
    }
  })

  describe('getDataDir()', () => {
    it('returns LINGOFLOW_DATA_DIR when set', async () => {
      process.env.LINGOFLOW_DATA_DIR = '/custom/data'
      const { getDataDir } = await import('../data-dir')
      expect(getDataDir()).toBe('/custom/data')
    })

    it('falls back to .lingoflow-data in cwd when env var is not set', async () => {
      delete process.env.LINGOFLOW_DATA_DIR
      const { getDataDir } = await import('../data-dir')
      expect(getDataDir()).toBe(path.join(process.cwd(), '.lingoflow-data'))
    })
  })

  describe('getTranscriptsDir()', () => {
    it('returns transcripts subdir inside data dir', async () => {
      process.env.LINGOFLOW_DATA_DIR = '/my/data'
      const { getTranscriptsDir } = await import('../data-dir')
      expect(getTranscriptsDir()).toBe('/my/data/transcripts')
    })
  })

  describe('getVideosDir()', () => {
    it('returns videos subdir inside data dir', async () => {
      process.env.LINGOFLOW_DATA_DIR = '/my/data'
      const { getVideosDir } = await import('../data-dir')
      expect(getVideosDir()).toBe('/my/data/videos')
    })
  })

  describe('getThumbnailsDir()', () => {
    it('returns thumbnails subdir inside data dir', async () => {
      process.env.LINGOFLOW_DATA_DIR = '/my/data'
      const { getThumbnailsDir } = await import('../data-dir')
      expect(getThumbnailsDir()).toBe('/my/data/thumbnails')
    })
  })

  describe('getDbPath()', () => {
    it('returns lingoflow.db path inside data dir', async () => {
      process.env.LINGOFLOW_DATA_DIR = '/my/data'
      const { getDbPath } = await import('../data-dir')
      expect(getDbPath()).toBe('/my/data/lingoflow.db')
    })
  })

  describe('subdirectory getters use getDataDir()', () => {
    it('all subdirectory getters reflect the same data dir', async () => {
      process.env.LINGOFLOW_DATA_DIR = '/unified/root'
      const { getDataDir, getTranscriptsDir, getVideosDir, getThumbnailsDir, getDbPath } =
        await import('../data-dir')
      const base = getDataDir()
      expect(getTranscriptsDir()).toBe(path.join(base, 'transcripts'))
      expect(getVideosDir()).toBe(path.join(base, 'videos'))
      expect(getThumbnailsDir()).toBe(path.join(base, 'thumbnails'))
      expect(getDbPath()).toBe(path.join(base, 'lingoflow.db'))
    })
  })
})
