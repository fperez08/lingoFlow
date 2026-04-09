/**
 * @jest-environment node
 */
import { GET } from '../route'

const mockGetSession = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServer: jest.fn(() =>
    Promise.resolve({
      auth: { getSession: mockGetSession },
      from: mockFrom,
    })
  ),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ toString: () => '', set: jest.fn() })),
}))

const mockVideos = [
  {
    id: 'v1',
    title: 'Video 1',
    tags: ['tag1'],
    transcript_path: 'path/v1.srt',
    transcript_format: 'srt',
    created_at: '2026-04-10T00:00:00Z',
    updated_at: '2026-04-10T00:00:00Z',
    author_name: 'Author 1',
    thumbnail_url: 'https://example.com/thumb1.jpg',
    youtube_url: 'https://youtube.com/watch?v=1',
  },
]

describe('GET /api/videos', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    const response = await GET()
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns videos array for authenticated user', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
    })

    const mockOrder = jest.fn().mockResolvedValue({ data: mockVideos, error: null })
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })

    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual(mockVideos)
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123')
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('returns 500 when database query fails', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
    })

    const mockOrder = jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') })
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })

    const response = await GET()
    expect(response.status).toBe(500)
  })
})
