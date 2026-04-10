// @jest-environment node
import { DELETE, PATCH, GET } from '../route'
import { videoStore, videoService } from '@/lib/server/composition'

jest.mock('next/server', () => ({
  NextResponse: class MockNextResponse {
    status: number
    body: unknown
    constructor(body: unknown, init?: { status?: number }) {
      this.body = body
      this.status = init?.status ?? 200
    }
    static json(data: unknown, init?: { status?: number }) {
      const res = new this(data, init)
      res.body = data
      return res
    }
  },
}))

jest.mock('@/lib/server/composition', () => ({
  videoStore: { getById: jest.fn() },
  videoService: { deleteVideo: jest.fn(), updateVideo: jest.fn() },
}))

const mockGetById = (videoStore.getById as jest.Mock)
const mockDeleteVideo = (videoService.deleteVideo as jest.Mock)
const mockUpdateVideo = (videoService.updateVideo as jest.Mock)

function makeRequest() {
  return { method: 'DELETE', url: 'http://localhost/api/videos/video-1' } as unknown as Request
}

describe('DELETE /api/videos/[id]', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns 404 if video not found', async () => {
    mockDeleteVideo.mockResolvedValue(false)
    const response = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(404)
  })

  it('returns 204 on successful delete', async () => {
    mockDeleteVideo.mockResolvedValue(true)
    const response = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(204)
    expect(mockDeleteVideo).toHaveBeenCalledWith('video-1')
  })

  it('calls service.deleteVideo with the correct id', async () => {
    mockDeleteVideo.mockResolvedValue(true)
    await DELETE(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(mockDeleteVideo).toHaveBeenCalledWith('video-1')
  })

  it('returns 404 when service.deleteVideo returns false', async () => {
    mockDeleteVideo.mockResolvedValue(false)
    await DELETE(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    const response = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(404)
  })
})

function makePatchRequest(fields: Record<string, unknown>) {
  const mockFormData = {
    get: jest.fn((key: string) => fields[key] ?? null),
  }
  return {
    method: 'PATCH',
    url: 'http://localhost/api/videos/video-1',
    formData: jest.fn().mockResolvedValue(mockFormData),
  } as unknown as Request
}

describe('PATCH /api/videos/[id]', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns 400 if tags field is missing', async () => {
    const response = await PATCH(makePatchRequest({}), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(400)
  })

  it('returns 400 if tags is not a JSON array', async () => {
    const response = await PATCH(makePatchRequest({ tags: '"not-an-array"' }), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(400)
  })

  it('returns 400 if tags is invalid JSON', async () => {
    const response = await PATCH(makePatchRequest({ tags: 'invalid-json' }), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(400)
  })

  it('returns 404 if video not found', async () => {
    mockUpdateVideo.mockResolvedValue(undefined)
    const response = await PATCH(makePatchRequest({ tags: JSON.stringify(['spanish']) }), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(404)
  })

  it('returns 200 with updated video on tags-only update', async () => {
    const updatedVideo = { id: 'video-1', tags: ['spanish', 'advanced'] }
    mockUpdateVideo.mockResolvedValue(updatedVideo)

    const response = await PATCH(makePatchRequest({ tags: JSON.stringify(['spanish', 'advanced']) }), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(200)
    expect(mockUpdateVideo).toHaveBeenCalledWith('video-1', { tags: ['spanish', 'advanced'] })
  })

  it('returns 200 and calls service.updateVideo with transcript params on transcript replacement', async () => {
    const updatedVideo = { id: 'video-1', tags: ['spanish'], transcript_path: '/new/path.srt' }
    mockUpdateVideo.mockResolvedValue(updatedVideo)

    const file = { name: 'subtitles.srt', size: 7, arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('content')) } as unknown as File
    const response = await PATCH(makePatchRequest({ tags: JSON.stringify(['spanish']), transcript: file }), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(200)
    expect(mockUpdateVideo).toHaveBeenCalledWith('video-1', expect.objectContaining({
      tags: ['spanish'],
      transcript_ext: 'srt',
      transcript_buffer: expect.any(Buffer),
    }))
  })

  it('returns 400 for invalid transcript extension', async () => {
    const file = { name: 'subtitles.pdf', size: 7, arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('content')) } as unknown as File
    const response = await PATCH(makePatchRequest({ tags: JSON.stringify(['spanish']), transcript: file }), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(400)
  })
})

function makeGetRequest() {
  return { method: 'GET', url: 'http://localhost/api/videos/video-1' } as unknown as Request
}

describe('GET /api/videos/[id]', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns 404 if video not found', async () => {
    mockGetById.mockReturnValue(undefined)
    const response = await GET(makeGetRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(404)
  })

  it('returns 200 with video data when found', async () => {
    const video = { id: 'video-1', title: 'Test', tags: ['t1'], transcript_path: 'p.srt', transcript_format: 'srt', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', author_name: 'A', thumbnail_url: 'http://t.com', youtube_url: 'http://y.com', youtube_id: 'abc' }
    mockGetById.mockReturnValue(video)
    const response = await GET(makeGetRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(200)
    expect(mockGetById).toHaveBeenCalledWith('video-1')
  })
})

