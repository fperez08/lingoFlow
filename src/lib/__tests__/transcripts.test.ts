/**
 * @jest-environment node
 */
import path from 'path'
import fs from 'fs'
import os from 'os'

describe('transcripts module', () => {
  let tmpDir: string
  let originalEnv: string | undefined

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lingoflow-transcripts-test-'))
    originalEnv = process.env.LINGOFLOW_DATA_DIR
    process.env.LINGOFLOW_DATA_DIR = tmpDir
    jest.resetModules()
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.LINGOFLOW_DATA_DIR
    } else {
      process.env.LINGOFLOW_DATA_DIR = originalEnv
    }
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('buildTranscriptPath returns the correct path', async () => {
    const { buildTranscriptPath } = await import('../transcripts')
    const result = buildTranscriptPath('abc123', 'txt')
    expect(result).toBe(path.join(tmpDir, 'transcripts', 'abc123.txt'))
  })

  it('writeTranscript creates the file with correct content', async () => {
    const { writeTranscript, buildTranscriptPath } = await import('../transcripts')
    const content = Buffer.from('hello world')
    const filePath = writeTranscript('vid1', 'txt', content)
    expect(fs.existsSync(filePath)).toBe(true)
    expect(fs.readFileSync(filePath)).toEqual(content)
    expect(filePath).toBe(buildTranscriptPath('vid1', 'txt'))
  })

  it('deleteTranscript removes an existing file', async () => {
    const { writeTranscript, deleteTranscript } = await import('../transcripts')
    const filePath = writeTranscript('vid2', 'txt', Buffer.from('data'))
    expect(fs.existsSync(filePath)).toBe(true)
    deleteTranscript(filePath)
    expect(fs.existsSync(filePath)).toBe(false)
  })

  it('deleteTranscript does not throw if file does not exist', async () => {
    const { deleteTranscript } = await import('../transcripts')
    const nonExistentPath = path.join(tmpDir, 'transcripts', 'nonexistent.txt')
    expect(() => deleteTranscript(nonExistentPath)).not.toThrow()
  })

  it('getTranscriptsDir returns path inside the data dir', async () => {
    const { getTranscriptsDir } = await import('../transcripts')
    expect(getTranscriptsDir()).toBe(path.join(tmpDir, 'transcripts'))
  })
})
