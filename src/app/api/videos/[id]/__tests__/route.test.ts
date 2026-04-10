// @jest-environment node
import { DELETE, PATCH } from '../route'

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

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServer: jest.fn(),
}))
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockReturnValue({ getAll: jest.fn().mockReturnValue([]), set: jest.fn() }),
}))
jest.mock('@/lib/videos', () => ({
  getVideoById: jest.fn(),
  deleteVideo: jest.fn(),
  updateVideo: jest.fn(),
}))
jest.mock('@/lib/transcripts', () => ({
  writeTranscript: jest.fn(),
  deleteTranscript: jest.fn(),
}))

import { getVideoById, deleteVideo, updateVideo } from '@/lib/videos'
import { writeTranscript, deleteTranscript } from '@/lib/transcripts'
import { createSupabaseServer } from '@/lib/supabase-server'

const mockGetVideoById = getVideoById as jest.Mock
const mockDeleteVideo = deleteVideo as jest.Mock
const mockUpdateVideo = updateVideo as jest.Mock
const mockWriteTranscript = writeTranscript as jest.Mock
const mockDeleteTranscript = deleteTranscript as jest.Mock
const mockCreateSupabaseServer = createSupabaseServer as jest.Mock

function makeRequest() {
  return { method: 'DELETE', url: 'http://localhost/api/videos/video-1' } as unknown as Request
}

describe('DELETE /api/videos/[id]', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns 404 if video not found', async () => {
    mockGetVideoById.mockReturnValue(undefined)
    const response = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(404)
  })

  it('returns 204 on successful delete', async () => {
    mockGetVideoById.mockReturnValue({ id: 'video-1', transcript_path: '' })
    mockDeleteVideo.mockReturnValue(true)
    const response = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(204)
    expect(mockDeleteVideo).toHaveBeenCalledWith('video-1')
  })

  it('calls deleteTranscript when transcript_path is present', async () => {
    mockGetVideoById.mockReturnValue({ id: 'video-1', transcript_path: '/data/transcripts/video-1.srt' })
    mockDeleteVideo.mockReturnValue(true)
    await DELETE(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(mockDeleteTranscript).toHaveBeenCalledWith('/data/transcripts/video-1.srt')
  })

  it('does not call deleteTranscript when transcript_path is empty', async () => {
    mockGetVideoById.mockReturnValue({ id: 'video-1', transcript_path: '' })
    mockDeleteVideo.mockReturnValue(true)
    await DELETE(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(mockDeleteTranscript).not.toHaveBeenCalled()
  })

  it('does not call deleteTranscript when transcript_path is null', async () => {
    mockGetVideoById.mockReturnValue({ id: 'video-1', transcript_path: null })
    mockDeleteVideo.mockReturnValue(true)
    await DELETE(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(mockDeleteTranscript).not.toHaveBeenCalled()
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
    mockGetVideoById.mockReturnValue(undefined)
    const response = await PATCH(makePatchRequest({ tags: JSON.stringify(['spanish']) }), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(404)
  })

  it('returns 200 with updated video on tags-only update', async () => {
    const existingVideo = { id: 'video-1', tags: ['old'], transcript_path: null }
    const updatedVideo = { id: 'video-1', tags: ['spanish', 'advanced'] }
    mockGetVideoById.mockReturnValue(existingVideo)
    mockUpdateVideo.mockReturnValue(updatedVideo)

    const response = await PATCH(makePatchRequest({ tags: JSON.stringify(['spanish', 'advanced']) }), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(200)
    expect(mockUpdateVideo).toHaveBeenCalledWith('video-1', { tags: ['spanish', 'advanced'] })
  })

  it('returns 200, calls writeTranscript and deleteTranscript on transcript replacement', async () => {
    const existingVideo = { id: 'video-1', tags: ['old'], transcript_path: '/old/path.srt' }
    const updatedVideo = { id: 'video-1', tags: ['spanish'], transcript_path: '/new/path.srt' }
    mockGetVideoById.mockReturnValue(existingVideo)
    mockWriteTranscript.mockReturnValue('/new/path.srt')
    mockUpdateVideo.mockReturnValue(updatedVideo)

    const file = { name: 'subtitles.srt', size: 7, arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('content')) } as unknown as File
    const response = await PATCH(makePatchRequest({ tags: JSON.stringify(['spanish']), transcript: file }), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(200)
    expect(mockWriteTranscript).toHaveBeenCalled()
    expect(mockDeleteTranscript).toHaveBeenCalledWith('/old/path.srt')
  })

  it('returns 400 for invalid transcript extension', async () => {
    const existingVideo = { id: 'video-1', tags: ['old'], transcript_path: null }
    mockGetVideoById.mockReturnValue(existingVideo)

    const file = { name: 'subtitles.pdf', size: 7, arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('content')) } as unknown as File
    const response = await PATCH(makePatchRequest({ tags: JSON.stringify(['spanish']), transcript: file }), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(400)
  })
})
