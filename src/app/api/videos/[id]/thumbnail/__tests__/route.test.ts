// @jest-environment node

// Polyfill Response/Headers for Jest node environment
/* eslint-disable @typescript-eslint/no-explicit-any */
if (typeof global.Response === 'undefined') {
  ;(global as any).Response = globalThis.Response ?? class Response {
    status: number
    headers: Headers
    private _body: unknown
    constructor(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this._body = body
      this.status = init?.status ?? 200
      const map: Record<string, string> = {}
      for (const [k, v] of Object.entries(init?.headers ?? {})) map[k.toLowerCase()] = v
      this.headers = { get: (key: string) => map[key.toLowerCase()] ?? null } as unknown as Headers
    }
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

jest.mock('@/lib/server/composition', () => ({
  videoStore: { getById: jest.fn() },
}))

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}))

import { videoStore } from '@/lib/server/composition'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fsMock = require('fs') as { readFileSync: jest.Mock; existsSync: jest.Mock }
const mockGetById = videoStore.getById as jest.Mock

const mockVideo = {
  id: 'video-1',
  title: 'Test',
  source_type: 'local',
  thumbnail_path: '/data/thumbnails/video-1.jpg',
  youtube_url: '',
  youtube_id: '',
  author_name: '',
  thumbnail_url: '',
  transcript_path: '',
  transcript_format: 'srt',
  tags: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function makeRequest(): Request {
  return {} as unknown as Request
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require('../route') as { GET: typeof import('../route').GET }

describe('GET /api/videos/[id]/thumbnail', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 404 when video not found', async () => {
    mockGetById.mockReturnValue(undefined)
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 404 when thumbnail_path is null', async () => {
    mockGetById.mockReturnValue({ ...mockVideo, thumbnail_path: null })
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 404 when thumbnail file cannot be read', async () => {
    mockGetById.mockReturnValue(mockVideo)
    fsMock.readFileSync.mockImplementation(() => { throw new Error('ENOENT') })
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 200 with image/jpeg content-type when thumbnail exists', async () => {
    mockGetById.mockReturnValue(mockVideo)
    fsMock.readFileSync.mockReturnValue(Buffer.from('fake-jpeg-data'))
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/jpeg')
  })

  it('includes cache-control header', async () => {
    mockGetById.mockReturnValue(mockVideo)
    fsMock.readFileSync.mockReturnValue(Buffer.from('fake-jpeg-data'))
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  })
})
