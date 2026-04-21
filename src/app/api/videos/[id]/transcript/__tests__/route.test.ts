/**
 * @jest-environment node
 */
import { GET } from '../route'
import * as composition from '@/lib/server/composition'
import { createContainer } from '@/lib/server/composition'
import type { Container } from '@/lib/server/composition'
import type { InsertVideoParams } from '@/lib/videos'
import fs from 'fs'

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn(),
}))

jest.mock('@/lib/server/composition', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual = jest.requireActual('@/lib/server/composition')
  return { ...actual, getContainer: jest.fn() }
})

const mockReadFileSync = fs.readFileSync as jest.Mock

let container: Container

function makeVideoParams(overrides: Partial<InsertVideoParams> = {}): InsertVideoParams {
  return {
    id: 'video-1',
    title: 'Test Video',
    author_name: 'Author',
    thumbnail_url: '',
    transcript_path: '/transcripts/video-1.srt',
    transcript_format: 'srt',
    tags: ['spanish'],
    source_type: 'local',
    ...overrides,
  }
}

function makeRequest(): Request {
  return { method: 'GET', url: 'http://localhost/api/videos/video-1/transcript' } as Request
}

const srtContent = `1
00:00:00,000 --> 00:00:02,000
Hello world

2
00:00:02,500 --> 00:00:05,000
This is a transcript
`

beforeEach(() => {
  container = createContainer(':memory:')
  ;(composition.getContainer as jest.Mock).mockReturnValue(container)
})

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('GET /api/videos/[id]/transcript', () => {
  it('returns 404 when video not found', async () => {
    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(404)
  })

  it('returns { cues: [] } when transcript_path is empty', async () => {
    container.videoStore.insert(makeVideoParams({ transcript_path: '' }))
    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ cues: [] })
  })

  it('returns parsed cues when transcript exists', async () => {
    container.videoStore.insert(makeVideoParams())
    mockReadFileSync.mockReturnValue(srtContent)
    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.cues).toHaveLength(2)
    expect(body.cues[0].text).toBe('Hello world')
    expect(body.cues[1].text).toBe('This is a transcript')
    expect(mockReadFileSync).toHaveBeenCalledWith('/transcripts/video-1.srt', 'utf-8')
  })
})
