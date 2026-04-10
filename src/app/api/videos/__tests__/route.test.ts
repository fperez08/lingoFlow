/**
 * @jest-environment node
 */
import { GET } from '../route'

const mockList = jest.fn()

jest.mock('@/lib/server/composition', () => ({
  getVideoStore: () => ({ list: mockList }),
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
    youtube_id: '1',
  },
]

describe('GET /api/videos', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns 200 with video array from store.list()', async () => {
    mockList.mockReturnValue(mockVideos)

    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual(mockVideos)
    expect(mockList).toHaveBeenCalledTimes(1)
  })

  it('returns 500 if store.list() throws', async () => {
    mockList.mockImplementation(() => {
      throw new Error('DB error')
    })

    const response = await GET()
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Internal server error')
  })
})
