/**
 * @jest-environment node
 */
import path from 'path'
import fs from 'fs'
import os from 'os'

describe('db module', () => {
  let tmpDir: string
  let originalEnv: string | undefined

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lingoflow-db-test-'))
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

  it('returns a database instance', () => {
    const { getDb } = require('../db')
    const db = getDb()
    expect(db).toBeDefined()
    expect(typeof db.prepare).toBe('function')
  })

  it('returns the same instance on repeated calls (singleton)', () => {
    const { getDb } = require('../db')
    const db1 = getDb()
    const db2 = getDb()
    expect(db1).toBe(db2)
  })

  it('creates the videos table', () => {
    const { getDb } = require('../db')
    const db = getDb()
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='videos'")
      .get() as { name: string } | undefined
    expect(row?.name).toBe('videos')
  })

  it('creates the data directory and transcripts subdirectory', () => {
    const { getDb } = require('../db')
    getDb()
    expect(fs.existsSync(tmpDir)).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'transcripts'))).toBe(true)
  })

  it('initialization is idempotent (calling getDb multiple times does not throw)', () => {
    const { getDb, _resetDbInstance } = require('../db')
    expect(() => {
      getDb()
      _resetDbInstance()
      getDb()
      _resetDbInstance()
      getDb()
    }).not.toThrow()
  })
})
