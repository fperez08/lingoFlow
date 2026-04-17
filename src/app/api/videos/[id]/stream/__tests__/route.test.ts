// @jest-environment node

// Polyfill ReadableStream for Jest node environment
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ReadableStream: WebReadableStream } = require('node:stream/web')
if (typeof global.ReadableStream === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(global as any).ReadableStream = WebReadableStream
}

import { videoStore } from '@/lib/server/composition'

jest.mock('@/lib/server/composition', () => ({
  videoStore: { getById: jest.fn() },
}))

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
  createReadStream: jest.fn(),
}))

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number
    body: unknown
    headers: { get: (key: string) => string | null }

    constructor(
      body: unknown,
      init?: { status?: number; headers?: Record<string, string> }
    ) {
      this.body = body
      this.status = init?.status ?? 200
      const headersMap: Record<string, string> = {}
      for (const [k, v] of Object.entries(init?.headers ?? {})) {
        headersMap[k.toLowerCase()] = v
      }
      this.headers = {
        get: (key: string) => headersMap[key.toLowerCase()] ?? null,
      }
    }

    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init)
    }
  }
  return { NextResponse: MockNextResponse }
})

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fsMock = require('fs') as {
  existsSync: jest.Mock
  statSync: jest.Mock
  createReadStream: jest.Mock
}

const mockGetById = videoStore.getById as jest.Mock

const mockLocalVideo = {
  id: 'video-1',
  source_type: 'local',
  local_video_path: 'videos/test.mp4',
  title: 'Test Video',
  youtube_url: '',
  youtube_id: '',
  author_name: 'Tester',
  thumbnail_url: '',
  transcript_path: '',
  transcript_format: 'srt',
  tags: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function makeRequest(headers: Record<string, string> = {}): Request {
  return {
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
  } as unknown as Request
}

// Import route after mocks are set up
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require('../route') as { GET: typeof import('../route').GET }

describe('GET /api/videos/[id]/stream', () => {
  beforeEach(() => {
    const mockStream = {
      on: jest.fn().mockReturnThis(),
    }
    fsMock.existsSync.mockReturnValue(true)
    fsMock.statSync.mockReturnValue({ size: 1000 })
    fsMock.createReadStream.mockReturnValue(mockStream)
  })

  afterEach(() => jest.clearAllMocks())

  it('returns 404 if video not found', async () => {
    mockGetById.mockReturnValue(undefined)
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 404 if video has no local_video_path', async () => {
    mockGetById.mockReturnValue({
      ...mockLocalVideo,
      source_type: 'youtube',
      local_video_path: null,
    })
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 404 if file does not exist on disk', async () => {
    mockGetById.mockReturnValue(mockLocalVideo)
    fsMock.existsSync.mockReturnValue(false)
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 200 with correct content-type for mp4', async () => {
    mockGetById.mockReturnValue(mockLocalVideo)
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('video/mp4')
  })

  it('returns 200 with accept-ranges header', async () => {
    mockGetById.mockReturnValue(mockLocalVideo)
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.headers.get('accept-ranges')).toBe('bytes')
  })

  it('returns 200 with correct content-type for webm', async () => {
    mockGetById.mockReturnValue({
      ...mockLocalVideo,
      local_video_path: 'videos/test.webm',
    })
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('video/webm')
  })

  it('returns 200 with correct content-type for mov', async () => {
    mockGetById.mockReturnValue({
      ...mockLocalVideo,
      local_video_path: 'videos/test.mov',
    })
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('video/quicktime')
  })

  it('returns 206 with correct range headers when Range header provided', async () => {
    mockGetById.mockReturnValue(mockLocalVideo)
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
    mockGetById.mockReturnValue(mockLocalVideo)
    const res = await GET(
      makeRequest({ range: 'bytes=500-' }),
      { params: Promise.resolve({ id: 'video-1' }) }
    )
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe('bytes 500-999/1000')
  })
})
