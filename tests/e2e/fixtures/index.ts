/**
 * E2E test fixtures: isolated LINGOFLOW_DATA_DIR provisioning, SQLite schema
 * initialization, and seeding utilities.
 *
 * Usage:
 *   const ctx = setupIsolatedDb()
 *   // ... use ctx.dataDir, seedVideo(), seedTranscript() ...
 *   teardownIsolatedDb(ctx)
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import os from 'os'

export interface FixtureContext {
  dataDir: string
  /** Original value of LINGOFLOW_DATA_DIR (may be undefined) */
  originalEnv: string | undefined
}

/**
 * Returns a unique data directory path (not yet created).
 * Callers can optionally pass a Playwright worker index to make the name
 * more deterministic for debugging.
 */
export function getIsolatedDataDir(workerIndex?: number): string {
  const suffix = workerIndex !== undefined
    ? `worker-${workerIndex}-${crypto.randomUUID()}`
    : crypto.randomUUID()
  return path.join(os.tmpdir(), `lingoflow-e2e-${suffix}`)
}

/**
 * Creates an isolated data dir, sets LINGOFLOW_DATA_DIR, and initialises the
 * SQLite schema by calling getDb().  Returns a context object that must be
 * passed to teardownIsolatedDb() afterwards.
 *
 * IMPORTANT: call jest.resetModules() (or equivalent) before this if you need
 * a fresh db singleton; in Playwright each worker process is isolated by default.
 */
export function setupIsolatedDb(workerIndex?: number): FixtureContext {
  const dataDir = getIsolatedDataDir(workerIndex)
  fs.mkdirSync(dataDir, { recursive: true })

  const originalEnv = process.env.LINGOFLOW_DATA_DIR
  process.env.LINGOFLOW_DATA_DIR = dataDir

  // Initialise schema (creates tables, WAL mode, transcripts subdir)
  const { getDb } = require('../../../src/lib/db')
  getDb()

  return { dataDir, originalEnv }
}

/**
 * Closes the db singleton, removes the isolated data dir, and restores
 * LINGOFLOW_DATA_DIR to its previous value.
 */
export function teardownIsolatedDb(ctx: FixtureContext): void {
  const { _resetDbInstance } = require('../../../src/lib/db')
  _resetDbInstance()

  if (ctx.originalEnv === undefined) {
    delete process.env.LINGOFLOW_DATA_DIR
  } else {
    process.env.LINGOFLOW_DATA_DIR = ctx.originalEnv
  }

  fs.rmSync(ctx.dataDir, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// Seeding helpers
// ---------------------------------------------------------------------------

export interface SeedVideoParams {
  id?: string
  youtube_url?: string
  youtube_id?: string
  title?: string
  author_name?: string
  thumbnail_url?: string
  transcript_path?: string
  transcript_format?: string
  tags?: string[]
}

/**
 * Inserts a video record into the isolated DB.  All fields have sensible
 * defaults so callers only need to supply what they care about.
 */
export function seedVideo(params: SeedVideoParams = {}) {
  const id = params.id ?? crypto.randomUUID()
  const { insertVideo } = require('../../../src/lib/videos')
  return insertVideo({
    id,
    youtube_url: params.youtube_url ?? `https://www.youtube.com/watch?v=${id}`,
    youtube_id: params.youtube_id ?? id,
    title: params.title ?? `Test Video ${id}`,
    author_name: params.author_name ?? 'Test Author',
    thumbnail_url: params.thumbnail_url ?? `https://img.youtube.com/vi/${id}/0.jpg`,
    transcript_path: params.transcript_path ?? `transcripts/${id}.txt`,
    transcript_format: params.transcript_format ?? 'txt',
    tags: params.tags ?? [],
  })
}

/**
 * Writes a transcript file into `$LINGOFLOW_DATA_DIR/transcripts/`.
 * Returns the absolute path of the written file.
 */
export function seedTranscript(videoId: string, ext: string, content: string): string {
  const { writeTranscript } = require('../../../src/lib/transcripts')
  return writeTranscript(videoId, ext, Buffer.from(content, 'utf8'))
}

// ---------------------------------------------------------------------------
// YouTube stub helpers
// ---------------------------------------------------------------------------

export interface YoutubeStubContext {
  /** Original value of E2E_STUB_YOUTUBE (may be undefined) */
  originalEnv: string | undefined
}

/**
 * Sets E2E_STUB_YOUTUBE=true so that fetchYoutubeMetadata() returns canned
 * responses instead of calling the real YouTube oEmbed API.
 *
 * Usage:
 *   const ctx = setupYoutubeStub()
 *   // ... run tests that call fetchYoutubeMetadata() ...
 *   teardownYoutubeStub(ctx)
 */
export function setupYoutubeStub(): YoutubeStubContext {
  const originalEnv = process.env.E2E_STUB_YOUTUBE
  process.env.E2E_STUB_YOUTUBE = 'true'
  return { originalEnv }
}

/**
 * Restores E2E_STUB_YOUTUBE to its previous value.
 */
export function teardownYoutubeStub(ctx: YoutubeStubContext): void {
  if (ctx.originalEnv === undefined) {
    delete process.env.E2E_STUB_YOUTUBE
  } else {
    process.env.E2E_STUB_YOUTUBE = ctx.originalEnv
  }
}
