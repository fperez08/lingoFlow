// @jest-environment node

jest.mock('@/lib/youtube')
jest.mock('@/lib/server/composition', () => ({ getVideoService: jest.fn() }))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}))

import { POST, ALLOWED_EXTENSIONS } from '../route'
import { fetchYoutubeMetadata } from '@/lib/youtube'
import { getVideoService } from '@/lib/server/composition'

const mockFetchYoutubeMetadata = fetchYoutubeMetadata as jest.MockedFunction<typeof fetchYoutubeMetadata>
const mockGetVideoService = getVideoService as jest.MockedFunction<typeof getVideoService>

const fakeService = {
  importVideo: jest.fn(),
  updateVideo: jest.fn(),
  deleteVideo: jest.fn(),
}

const fakeMetadata = {
  youtube_id: 'abc123',
  title: 'Test Video',
  author_name: 'Test Author',
  thumbnail_url: 'https://img.youtube.com/vi/abc123/0.jpg',
}

const fakeVideo = {
  id: 'video-uuid',
  youtube_url: 'https://www.youtube.com/watch?v=abc123',
  youtube_id: 'abc123',
  title: 'Test Video',
  author_name: 'Test Author',
  thumbnail_url: 'https://img.youtube.com/vi/abc123/0.jpg',
  transcript_path: '/data/transcripts/video-uuid.srt',
  transcript_format: 'srt',
  tags: ['language', 'english'],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

function makeFormData(fields: Record<string, string | File>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value)
  }
  return fd
}

function makeRequest(formData: FormData): { formData: () => Promise<FormData> } {
  return { formData: async () => formData }
}

describe('POST /api/videos/import', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchYoutubeMetadata.mockResolvedValue(fakeMetadata)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetVideoService.mockReturnValue(fakeService as any)
    fakeService.importVideo.mockResolvedValue(fakeVideo)
  })

  it('returns 400 when youtube_url is empty string', async () => {
    const transcriptFile = new File(['content'], 'transcript.srt', { type: 'text/plain' })
    const fd = makeFormData({ youtube_url: '   ', transcript: transcriptFile })
    const req = makeRequest(fd)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Missing required fields: youtube_url and transcript')
  })

  it('returns 400 when transcript has empty filename (no extension)', async () => {
    const transcriptFile = new File([], '', { type: 'text/plain' })
    const fd = makeFormData({
      youtube_url: 'https://www.youtube.com/watch?v=abc123',
      transcript: transcriptFile,
    })
    const req = makeRequest(fd)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid file extension. Allowed: srt, vtt, txt')
  })

  it('returns 400 when tags is a non-string (File)', async () => {
    const transcriptFile = new File(['content'], 'transcript.srt', { type: 'text/plain' })
    const tagsFile = new File(['tag1'], 'tags.txt', { type: 'text/plain' })
    const fd = new FormData()
    fd.append('youtube_url', 'https://www.youtube.com/watch?v=abc123')
    fd.append('transcript', transcriptFile)
    fd.append('tags', tagsFile)
    const req = makeRequest(fd)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid tags field')
  })

  it('returns 201 with empty tags array when no tags provided', async () => {
    const fakeVideoNoTags = { ...fakeVideo, tags: [] }
    fakeService.importVideo.mockResolvedValue(fakeVideoNoTags)
    const content = '1\n00:00:01,000 --> 00:00:02,000\nHello'
    const transcriptFile = Object.assign(
      new File([content], 'transcript.srt', { type: 'text/plain' }),
      { arrayBuffer: async () => Buffer.from(content).buffer }
    )
    const fd = makeFormData({
      youtube_url: 'https://www.youtube.com/watch?v=abc123',
      transcript: transcriptFile,
    })
    const req = makeRequest(fd)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.tags).toEqual([])
    expect(fakeService.importVideo).toHaveBeenCalledWith(
      expect.objectContaining({ tags: [] })
    )
  })

  it('exports ALLOWED_EXTENSIONS with srt, vtt, txt', () => {
    expect(ALLOWED_EXTENSIONS).toEqual(['srt', 'vtt', 'txt'])
  })

  it('returns 400 when youtube_url is missing', async () => {
    const transcriptFile = new File(['content'], 'transcript.srt', { type: 'text/plain' })
    const fd = makeFormData({ transcript: transcriptFile })
    const req = makeRequest(fd)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Missing required fields/)
  })

  it('returns 400 when transcript file is missing', async () => {
    const fd = makeFormData({ youtube_url: 'https://www.youtube.com/watch?v=abc123' })
    const req = makeRequest(fd)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Missing required fields/)
  })

  it('returns 400 for invalid transcript extension', async () => {
    const transcriptFile = new File(['content'], 'transcript.pdf', { type: 'application/pdf' })
    const fd = makeFormData({
      youtube_url: 'https://www.youtube.com/watch?v=abc123',
      transcript: transcriptFile,
    })
    const req = makeRequest(fd)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Invalid file extension/)
  })

  it('returns 422 when YouTube metadata fetch fails', async () => {
    mockFetchYoutubeMetadata.mockRejectedValue(new Error('Invalid YouTube URL'))
    const transcriptFile = new File(['content'], 'transcript.srt', { type: 'text/plain' })
    const fd = makeFormData({
      youtube_url: 'https://www.youtube.com/watch?v=abc123',
      transcript: transcriptFile,
    })
    const req = makeRequest(fd)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toBe('Invalid YouTube URL')
  })

  it('returns 201 with video object on successful import', async () => {
    const content = '1\n00:00:01,000 --> 00:00:02,000\nHello'
    const transcriptFile = Object.assign(
      new File([content], 'transcript.srt', { type: 'text/plain' }),
      { arrayBuffer: async () => Buffer.from(content).buffer }
    )
    const fd = makeFormData({
      youtube_url: 'https://www.youtube.com/watch?v=abc123',
      transcript: transcriptFile,
      tags: 'language, english',
    })
    const req = makeRequest(fd)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toEqual(fakeVideo)
    expect(fakeService.importVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        youtube_url: 'https://www.youtube.com/watch?v=abc123',
        transcript_ext: 'srt',
        tags: ['language', 'english'],
      })
    )
  })
})

