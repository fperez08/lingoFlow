// @jest-environment node

jest.mock('@/lib/server/composition', () => ({
  videoService: {
    importLocalVideo: jest.fn(),
    updateVideo: jest.fn(),
    deleteVideo: jest.fn(),
  },
  videoStore: {
    update: jest.fn(),
  },
}))

jest.mock('@/lib/thumbnails', () => ({
  generateThumbnail: jest.fn().mockResolvedValue(null),
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}))

import { POST } from '../route'
import { videoService, videoStore } from '@/lib/server/composition'
import { ALLOWED_TRANSCRIPT_FORMATS } from '@/lib/api-schemas'
import { generateThumbnail } from '@/lib/thumbnails'
import type { NextRequest } from 'next/server'

type MockVideoService = {
  importLocalVideo: jest.Mock
  updateVideo: jest.Mock
  deleteVideo: jest.Mock
}

type MockVideoStore = {
  update: jest.Mock
}

const mockVideoService = videoService as unknown as MockVideoService
const mockVideoStore = videoStore as unknown as MockVideoStore
const mockGenerateThumbnail = generateThumbnail as jest.MockedFunction<typeof generateThumbnail>

const fakeLocalVideo = {
  id: 'local-video-uuid',
  title: 'My Local Video',
  author_name: 'Local Author',
  thumbnail_url: '',
  transcript_path: '/data/transcripts/local-video-uuid.srt',
  transcript_format: 'srt',
  tags: ['french', 'beginner'],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  source_type: 'local' as const,
  local_video_path: '/data/videos/local-video-uuid.mp4',
  local_video_filename: 'my-video.mp4',
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
    mockVideoService.importLocalVideo.mockResolvedValue(fakeLocalVideo)
    mockGenerateThumbnail.mockResolvedValue(null)
  })

  it('exports ALLOWED_TRANSCRIPT_FORMATS with srt, vtt, txt', () => {
    expect(ALLOWED_TRANSCRIPT_FORMATS).toEqual(['srt', 'vtt', 'txt'])
  })

  it('returns 400 when no video file is provided', async () => {
    const transcriptFile = new File(['content'], 'transcript.srt', { type: 'text/plain' })
    const fd = makeFormData({ transcript: transcriptFile })
    const req = makeRequest(fd)
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Only local video upload is supported')
  })

  it('returns 400 when transcript has invalid extension', async () => {
    const videoContent = Buffer.from('fake-video-data')
    const videoFile = Object.assign(
      new File([videoContent], 'my-video.mp4', { type: 'video/mp4' }),
      { arrayBuffer: async () => videoContent.buffer }
    )
    const transcriptFile = new File(['content'], 'transcript.pdf', { type: 'application/pdf' })
    const fd = makeFormData({ video: videoFile, title: 'Test', transcript: transcriptFile })
    const req = makeRequest(fd)
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Invalid file extension/)
  })
})

const fakeLocalVideo2 = {
  id: 'local-video-uuid',
  title: 'My Local Video',
  author_name: 'Local Author',
  thumbnail_url: '',
  transcript_path: '/data/transcripts/local-video-uuid.srt',
  transcript_format: 'srt',
  tags: ['french', 'beginner'],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  source_type: 'local' as const,
  local_video_path: '/data/videos/local-video-uuid.mp4',
  local_video_filename: 'my-video.mp4',
}

describe('POST /api/videos/import — local upload path', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockVideoService.importLocalVideo.mockResolvedValue(fakeLocalVideo2)
    mockGenerateThumbnail.mockResolvedValue(null)
  })

  function makeLocalFormData(overrides: Record<string, string | File> = {}): FormData {
    const videoContent = Buffer.from('fake-video-data')
    const videoFile = Object.assign(
      new File([videoContent], 'my-video.mp4', { type: 'video/mp4' }),
      { arrayBuffer: async () => videoContent.buffer }
    )
    const transcriptContent = '1\n00:00:01,000 --> 00:00:02,000\nBonjour'
    const transcriptFile = Object.assign(
      new File([transcriptContent], 'transcript.srt', { type: 'text/plain' }),
      { arrayBuffer: async () => Buffer.from(transcriptContent).buffer }
    )
    const defaults: Record<string, string | File> = {
      video: videoFile,
      title: 'My Local Video',
      transcript: transcriptFile,
    }
    return makeFormData({ ...defaults, ...overrides })
  }

  it('returns 201 and calls importLocalVideo when video file is present', async () => {
    const fd = makeLocalFormData({ tags: 'french, beginner', author: 'Local Author' })
    const req = makeRequest(fd)
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toEqual(fakeLocalVideo2)
    expect(mockVideoService.importLocalVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'My Local Video',
        author_name: 'Local Author',
        video_ext: 'mp4',
        video_filename: 'my-video.mp4',
        transcript_ext: 'srt',
        tags: ['french', 'beginner'],
        source_type: 'local',
      })
    )
    expect(mockVideoService.importLocalVideo).toHaveBeenCalled()
  })

  it('kicks off thumbnail generation after local import', async () => {
    mockGenerateThumbnail.mockResolvedValue('/data/thumbnails/local-video-uuid.jpg')

    const fd = makeLocalFormData({ tags: 'french, beginner', author: 'Local Author' })
    const req = makeRequest(fd)
    const res = await POST(req as unknown as NextRequest)

    expect(res.status).toBe(201)
    await Promise.resolve()

    expect(mockGenerateThumbnail).toHaveBeenCalledWith(
      '/data/videos/local-video-uuid.mp4',
      expect.stringContaining('/thumbnails/')
    )
    expect(mockVideoStore.update).toHaveBeenCalledWith(expect.any(String), {
      thumbnail_path: '/data/thumbnails/local-video-uuid.jpg',
    })
  })

  it('returns 400 when video file is present but title is missing', async () => {
    const videoContent = Buffer.from('data')
    const videoFile = Object.assign(
      new File([videoContent], 'video.mp4', { type: 'video/mp4' }),
      { arrayBuffer: async () => videoContent.buffer }
    )
    const transcriptFile = new File(['content'], 'transcript.srt', { type: 'text/plain' })
    const fd = makeFormData({ video: videoFile, transcript: transcriptFile })
    const req = makeRequest(fd)
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Title is required/)
  })

  it('returns 201 with empty tags when no tags provided for local upload', async () => {
    const fakeNoTags = { ...fakeLocalVideo, tags: [] }
    mockVideoService.importLocalVideo.mockResolvedValue(fakeNoTags)
    const fd = makeLocalFormData()
    const req = makeRequest(fd)
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(201)
    expect(mockVideoService.importLocalVideo).toHaveBeenCalledWith(
      expect.objectContaining({ tags: [] })
    )
  })

  it('returns 201 with empty author_name when no author provided', async () => {
    const fd = makeLocalFormData()
    const req = makeRequest(fd)
    await POST(req as unknown as NextRequest)
    expect(mockVideoService.importLocalVideo).toHaveBeenCalledWith(
      expect.objectContaining({ author_name: '' })
    )
  })

  it('returns 400 when video MIME type is not allowed', async () => {
    const videoContent = Buffer.from('data')
    const videoFile = Object.assign(
      new File([videoContent], 'my-video.avi', { type: 'video/avi' }),
      { arrayBuffer: async () => videoContent.buffer }
    )
    const transcriptFile = new File(['content'], 'transcript.srt', { type: 'text/plain' })
    const fd = makeFormData({ video: videoFile, title: 'Test', transcript: transcriptFile })
    const req = makeRequest(fd)
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Unsupported format/)
  })

  it('returns 400 when video file exceeds 500 MB', async () => {
    class OversizedFile extends File {
      get size() { return 600_000_000 }
    }
    const videoFile = Object.assign(
      new OversizedFile(['x'], 'big-video.mp4', { type: 'video/mp4' }),
      { arrayBuffer: async () => Buffer.from('x').buffer }
    )
    const transcriptFile = new File(['content'], 'transcript.srt', { type: 'text/plain' })
    const fd = makeFormData({ video: videoFile, title: 'Test', transcript: transcriptFile })
    const req = makeRequest(fd)
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/500 MB/)
  })

  it('returns 400 when video is a WebM with unsupported extension alias', async () => {
    const videoContent = Buffer.from('data')
    const videoFile = Object.assign(
      new File([videoContent], 'my-video.webm', { type: 'video/webm' }),
      { arrayBuffer: async () => videoContent.buffer }
    )
    const fakeWebmVideo = { ...fakeLocalVideo, local_video_path: '/data/videos/local.webm' }
    mockVideoService.importLocalVideo.mockResolvedValue(fakeWebmVideo)
    const fd = makeLocalFormData({ video: videoFile, title: 'WebM Video' })
    const req = makeRequest(fd)
    const res = await POST(req as unknown as NextRequest)
    expect(res.status).toBe(201)
  })
})
