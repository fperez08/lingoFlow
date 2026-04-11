// @jest-environment node
import { GET } from '../route'
import { videoStore } from '@/lib/server/composition'
import fs from 'fs'

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
}))

jest.mock('fs')

const mockGetById = videoStore.getById as jest.Mock
const mockReadFileSync = fs.readFileSync as jest.Mock

const baseVideo = {
  id: 'video-1',
  youtube_url: 'https://youtube.com/watch?v=abc',
  youtube_id: 'abc',
  title: 'Test Video',
  author_name: 'Author',
  thumbnail_url: 'https://img.example.com/thumb.jpg',
  transcript_path: '/data/transcripts/video-1.srt',
  transcript_format: 'srt',
  tags: ['spanish'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const srtContent = `1
00:00:00,000 --> 00:00:02,000
Hello world

2
00:00:02,500 --> 00:00:05,000
This is a transcript
`

function makeRequest() {
  return { method: 'GET', url: 'http://localhost/api/videos/video-1/transcript' } as Request
}

describe('GET /api/videos/[id]/transcript', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns 404 when video not found', async () => {
    mockGetById.mockReturnValue(undefined)
    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(404)
  })

  it('returns { cues: [] } when transcript_path is null', async () => {
    mockGetById.mockReturnValue({ ...baseVideo, transcript_path: null })
    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(200)
    expect((response as { body: { cues: unknown[] } }).body).toEqual({ cues: [] })
  })

  it('returns parsed cues when transcript exists', async () => {
    mockGetById.mockReturnValue(baseVideo)
    mockReadFileSync.mockReturnValue(srtContent)
    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(200)
    const body = (response as { body: { cues: { text: string }[] } }).body
    expect(body.cues).toHaveLength(2)
    expect(body.cues[0].text).toBe('Hello world')
    expect(body.cues[1].text).toBe('This is a transcript')
    expect(mockReadFileSync).toHaveBeenCalledWith('/data/transcripts/video-1.srt', 'utf-8')
  })
})
