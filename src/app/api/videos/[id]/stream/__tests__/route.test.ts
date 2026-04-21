/**
 * @jest-environment node
 */

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  statSync: jest.fn(),
  createReadStream: jest.fn(),
}))

jest.mock('@/lib/server/composition', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual = jest.requireActual('@/lib/server/composition')
  return { ...actual, getContainer: jest.fn() }
})

import * as composition from '@/lib/server/composition'
import { createContainer } from '@/lib/server/composition'
import type { Container } from '@/lib/server/composition'
import type { InsertVideoParams } from '@/lib/videos'
import { GET } from '../route'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fsMock = require('fs') as {
  existsSync: jest.Mock
  statSync: jest.Mock
  createReadStream: jest.Mock
}

let container: Container

function makeVideoParams(overrides: Partial<InsertVideoParams> = {}): InsertVideoParams {
  return {
    id: 'video-1',
    title: 'Test Video',
    author_name: 'Tester',
    thumbnail_url: '',
    transcript_path: '',
    transcript_format: 'srt',
    tags: [],
    source_type: 'local',
    local_video_path: 'videos/test.mp4',
    local_video_filename: 'test.mp4',
    ...overrides,
  }
}

function makeRequest(headers: Record<string, string> = {}): Request {
  return {
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
  } as unknown as Request
}

beforeEach(() => {
  container = createContainer(':memory:')
  ;(composition.getContainer as jest.Mock).mockReturnValue(container)

  const mockStream = { on: jest.fn().mockReturnThis() }
  fsMock.existsSync.mockReturnValue(true)
  fsMock.statSync.mockReturnValue({ size: 1000 })
  fsMock.createReadStream.mockReturnValue(mockStream)
})

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('GET /api/videos/[id]/stream', () => {
  it('returns 404 if video not found', async () => {
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 404 if video has no local_video_path', async () => {
    container.videoStore.insert(makeVideoParams({ local_video_path: null }))
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 404 if file does not exist on disk', async () => {
    container.videoStore.insert(makeVideoParams())
    fsMock.existsSync.mockReturnValue(false)
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 200 with correct content-type for mp4', async () => {
    container.videoStore.insert(makeVideoParams())
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('video/mp4')
  })

  it('returns 200 with accept-ranges header', async () => {
    container.videoStore.insert(makeVideoParams())
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.headers.get('accept-ranges')).toBe('bytes')
  })

  it('returns 200 with correct content-type for webm', async () => {
    container.videoStore.insert(makeVideoParams({ local_video_path: 'videos/test.webm', local_video_filename: 'test.webm' }))
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('video/webm')
  })

  it('returns 200 with correct content-type for mov', async () => {
    container.videoStore.insert(makeVideoParams({ local_video_path: 'videos/test.mov', local_video_filename: 'test.mov' }))
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('video/quicktime')
  })

  it('returns 206 with correct range headers when Range header provided', async () => {
    container.videoStore.insert(makeVideoParams())
    const res = await GET(
      makeRequest({ range: 'bytes=0-499' }),
      { params: Promise.resolve({ id: 'video-1' }) }
    )
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe('bytes 0-499/1000')
    expect(res.headers.get('content-length')).toBe('500')
    expect(res.headers.get('accept-ranges')).toBe('bytes')
  })

  it('returns 206 with end calculated from file size when end omitted in range', async () => {
    container.videoStore.insert(makeVideoParams())
    const res = await GET(
      makeRequest({ range: 'bytes=500-' }),
      { params: Promise.resolve({ id: 'video-1' }) }
    )
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe('bytes 500-999/1000')
  })
})
