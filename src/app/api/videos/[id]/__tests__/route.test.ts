// @jest-environment node
import { DELETE } from '../route'

jest.mock('next/server', () => ({
  NextResponse: class MockNextResponse {
    status: number
    body: unknown
    constructor(body: unknown, init?: { status?: number }) {
      this.body = body
      this.status = init?.status ?? 200
    }
  },
}))

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServer: jest.fn(),
}))
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockReturnValue({ getAll: jest.fn().mockReturnValue([]), set: jest.fn() }),
}))

import { createSupabaseServer } from '@/lib/supabase-server'
const mockCreateSupabaseServer = createSupabaseServer as jest.Mock

function makeRequest() {
  return { method: 'DELETE', url: 'http://localhost/api/videos/video-1' } as unknown as Request
}

describe('DELETE /api/videos/[id]', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns 401 if unauthenticated', async () => {
    mockCreateSupabaseServer.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
      from: jest.fn(),
      storage: { from: jest.fn() },
    })

    const response = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(401)
  })

  it('returns 403 if video not found', async () => {
    const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

    mockCreateSupabaseServer.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: mockFrom,
      storage: { from: jest.fn() },
    })

    const response = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(403)
  })

  it('returns 403 if video belongs to different user', async () => {
    const mockSingle = jest.fn().mockResolvedValue({
      data: { id: 'video-1', user_id: 'user-2', transcript_path: null },
      error: null,
    })
    const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

    mockCreateSupabaseServer.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: mockFrom,
      storage: { from: jest.fn() },
    })

    const response = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(403)
  })

  it('returns 204 on success, calls storage.remove and db delete', async () => {
    const mockRemove = jest.fn().mockResolvedValue({ error: null })
    const mockStorageFrom = jest.fn().mockReturnValue({ remove: mockRemove })

    const mockDeleteEq = jest.fn().mockResolvedValue({ error: null })
    const mockDelete = jest.fn().mockReturnValue({ eq: mockDeleteEq })

    const mockSingle = jest.fn().mockResolvedValue({
      data: { id: 'video-1', user_id: 'user-1', transcript_path: 'transcripts/video-1.srt' },
      error: null,
    })
    const mockSelectEq = jest.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockSelectEq })

    const mockFrom = jest.fn((table: string) => {
      if (table === 'videos') {
        return { select: mockSelect, delete: mockDelete }
      }
      return {}
    })

    mockCreateSupabaseServer.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: mockFrom,
      storage: { from: mockStorageFrom },
    })

    const response = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(204)
    expect(mockStorageFrom).toHaveBeenCalledWith('transcripts')
    expect(mockRemove).toHaveBeenCalledWith(['transcripts/video-1.srt'])
    expect(mockDelete).toHaveBeenCalled()
  })
})
