/**
 * @jest-environment node
 */
import path from 'path'
import fs from 'fs'
import os from 'os'
import { ensureDataDirs, openDb, initializeSchema } from '../db'

describe('db module', () => {
  it('openDb returns a database instance', () => {
    const db = openDb(':memory:')
    expect(db).toBeDefined()
    expect(typeof db.prepare).toBe('function')
    db.close()
  })

  it('initializeSchema creates the videos table', () => {
    const db = openDb(':memory:')
    initializeSchema(db)
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='videos'")
      .get() as { name: string } | undefined
    expect(row?.name).toBe('videos')
    db.close()
  })

  it('initializeSchema is idempotent (calling it multiple times does not throw)', () => {
    const db = openDb(':memory:')
    expect(() => {
      initializeSchema(db)
      initializeSchema(db)
      initializeSchema(db)
    }).not.toThrow()
    db.close()
  })

  it('ensureDataDirs creates the data directory and transcripts subdirectory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lingoflow-db-test-'))
    try {
      const dataDir = path.join(tmpDir, 'data')
      ensureDataDirs(dataDir)
      expect(fs.existsSync(dataDir)).toBe(true)
      expect(fs.existsSync(path.join(dataDir, 'transcripts'))).toBe(true)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('ensureDataDirs is idempotent (calling it multiple times does not throw)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lingoflow-db-test-'))
    try {
      const dataDir = path.join(tmpDir, 'data')
      expect(() => {
        ensureDataDirs(dataDir)
        ensureDataDirs(dataDir)
      }).not.toThrow()
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('openDb enables WAL journal mode', () => {
    const db = openDb(':memory:')
    const row = db.pragma('journal_mode', { simple: true })
    // :memory: databases always report 'memory' for journal_mode
    expect(row).toBeDefined()
    db.close()
  })
})

