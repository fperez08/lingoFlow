// @jest-environment node

import fs from 'fs'
import path from 'path'
import os from 'os'

// Override data dir to a temp dir for testing
const testDataDir = path.join(os.tmpdir(), `lingoflow-test-${process.pid}`)
process.env.LINGOFLOW_DATA_DIR = testDataDir

import { writeVideoFile, deleteVideoFile, getVideosDir } from '../video-files'

describe('writeVideoFile', () => {
  beforeAll(() => {
    fs.mkdirSync(path.join(testDataDir, 'videos'), { recursive: true })
  })

  afterAll(() => {
    fs.rmSync(testDataDir, { recursive: true, force: true })
  })

  it('writes video buffer to .lingoflow-data/videos/<videoId>.<ext> and returns absolute path', async () => {
    const buffer = Buffer.from('fake-video-content')
    const filePath = await writeVideoFile('test-video-id', 'mp4', buffer)

    expect(path.isAbsolute(filePath)).toBe(true)
    expect(filePath).toMatch(/test-video-id\.mp4$/)
    expect(fs.existsSync(filePath)).toBe(true)
    expect(fs.readFileSync(filePath)).toEqual(buffer)
  })

  it('creates the videos directory if it does not exist', async () => {
    const newDir = path.join(testDataDir, 'videos-new')
    const originalEnv = process.env.LINGOFLOW_DATA_DIR
    process.env.LINGOFLOW_DATA_DIR = path.join(testDataDir, 'nested-new')

    const buffer = Buffer.from('content')
    const filePath = await writeVideoFile('vid-id', 'webm', buffer)

    expect(fs.existsSync(filePath)).toBe(true)
    expect(filePath).toContain('vid-id.webm')

    process.env.LINGOFLOW_DATA_DIR = originalEnv
    fs.rmSync(path.join(testDataDir, 'nested-new'), { recursive: true, force: true })
    void newDir
  })

  it('returns path under the configured videos directory', async () => {
    const buffer = Buffer.from('data')
    const filePath = await writeVideoFile('abc-123', 'mov', buffer)
    const videosDir = getVideosDir()

    expect(filePath.startsWith(videosDir)).toBe(true)
  })
})

describe('deleteVideoFile', () => {
  it('deletes an existing video file', async () => {
    const buffer = Buffer.from('to-delete')
    const filePath = await writeVideoFile('delete-me', 'mp4', buffer)

    expect(fs.existsSync(filePath)).toBe(true)
    await deleteVideoFile(filePath)
    expect(fs.existsSync(filePath)).toBe(false)
  })

  it('does not throw if the file does not exist', async () => {
    await expect(deleteVideoFile('/nonexistent/path/file.mp4')).resolves.not.toThrow()
  })
})
