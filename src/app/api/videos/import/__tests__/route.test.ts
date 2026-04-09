// @jest-environment node

jest.mock('@/lib/youtube')
jest.mock('@/lib/transcripts')
jest.mock('@/lib/videos')

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}))

import { POST } from '../route'
import { fetchYoutubeMetadata } from '@/lib/youtube'
import { writeTranscript } from '@/lib/transcripts'
import { insertVideo } from '@/lib/videos'

const mockFetchYoutubeMetadata = fetchYoutubeMetadata as jest.MockedFunction<typeof fetchYoutubeMetadata>
const mockWriteTranscript = writeTranscript as jest.MockedFunction<typeof writeTranscript>
const mockInsertVideo = insertVideo as jest.MockedFunction<typeof insertVideo>

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
    mockWriteTranscript.mockReturnValue('/data/transcripts/video-uuid.srt')
    mockInsertVideo.mockReturnValue(fakeVideo)
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
    expect(mockWriteTranscript).toHaveBeenCalled()
    expect(mockInsertVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        youtube_url: 'https://www.youtube.com/watch?v=abc123',
        transcript_format: 'srt',
        tags: ['language', 'english'],
      })
    )
  })
})
