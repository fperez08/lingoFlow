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
}))
jest.mock('@/lib/transcripts', () => ({
  deleteTranscript: jest.fn(),
}))

import { getVideoById, deleteVideo } from '@/lib/videos'
import { deleteTranscript } from '@/lib/transcripts'
import { createSupabaseServer } from '@/lib/supabase-server'

const mockGetVideoById = getVideoById as jest.Mock
const mockDeleteVideo = deleteVideo as jest.Mock
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

function makePatchRequest(formData: FormData) {
  return {
    method: 'PATCH',
    url: 'http://localhost/api/videos/video-1',
    formData: jest.fn().mockResolvedValue(formData),
  } as unknown as Request
}

describe('PATCH /api/videos/[id]', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns 401 if no session', async () => {
    mockCreateSupabaseServer.mockResolvedValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
      from: jest.fn(),
      storage: { from: jest.fn() },
    })

    const fd = new FormData()
    fd.append('tags', JSON.stringify([]))
    const response = await PATCH(makePatchRequest(fd), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(401)
  })

  it('returns 403 if video does not belong to user', async () => {
    const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const mockEqUser = jest.fn().mockReturnValue({ single: mockSingle })
    const mockEqId = jest.fn().mockReturnValue({ eq: mockEqUser })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEqId })
    const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

    mockCreateSupabaseServer.mockResolvedValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } }) },
      from: mockFrom,
      storage: { from: jest.fn() },
    })

    const fd = new FormData()
    fd.append('tags', JSON.stringify(['spanish']))
    const response = await PATCH(makePatchRequest(fd), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(403)
  })

  it('returns 200 with updated video on tags-only update', async () => {
    const updatedVideo = { id: 'video-1', tags: ['spanish', 'advanced'], user_id: 'user-1' }

    const mockSingle = jest.fn()
      .mockResolvedValueOnce({ data: { transcript_path: null }, error: null })
      .mockResolvedValueOnce({ data: updatedVideo, error: null })

    const mockEqUserId = jest.fn().mockReturnValue({ single: mockSingle })
    const mockEqId = jest.fn().mockReturnValue({ eq: mockEqUserId })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEqId })
    const mockUpdateEqUserId = jest.fn().mockReturnValue({ select: () => ({ single: mockSingle }) })
    const mockUpdateEqId = jest.fn().mockReturnValue({ eq: mockUpdateEqUserId })
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEqId })

    const mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    })

    mockCreateSupabaseServer.mockResolvedValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } }) },
      from: mockFrom,
      storage: { from: jest.fn() },
    })

    const fd = new FormData()
    fd.append('tags', JSON.stringify(['spanish', 'advanced']))
    const response = await PATCH(makePatchRequest(fd), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(200)
  })

  it('returns 200 and calls storage.upload + storage.remove on transcript replacement', async () => {
    const updatedVideo = { id: 'video-1', tags: ['spanish'], transcript_path: 'user-1/new.srt' }

    const mockSingle = jest.fn()
      .mockResolvedValueOnce({ data: { transcript_path: 'user-1/old.srt' }, error: null })
      .mockResolvedValueOnce({ data: updatedVideo, error: null })

    const mockEqUserId = jest.fn().mockReturnValue({ single: mockSingle })
    const mockEqId = jest.fn().mockReturnValue({ eq: mockEqUserId })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEqId })
    const mockUpdateEqUserId = jest.fn().mockReturnValue({ select: () => ({ single: mockSingle }) })
    const mockUpdateEqId = jest.fn().mockReturnValue({ eq: mockUpdateEqUserId })
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEqId })

    const mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    })

    const mockUpload = jest.fn().mockResolvedValue({ error: null })
    const mockRemove = jest.fn().mockResolvedValue({ error: null })
    const mockStorageFrom = jest.fn().mockReturnValue({ upload: mockUpload, remove: mockRemove })

    mockCreateSupabaseServer.mockResolvedValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } }) },
      from: mockFrom,
      storage: { from: mockStorageFrom },
    })

    const file = new File(['content'], 'subtitles.srt', { type: 'text/plain' })
    const fd = new FormData()
    fd.append('tags', JSON.stringify(['spanish']))
    fd.append('transcript', file)
    const response = await PATCH(makePatchRequest(fd), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(200)
    expect(mockUpload).toHaveBeenCalled()
    expect(mockRemove).toHaveBeenCalledWith(['user-1/old.srt'])
  })
})
