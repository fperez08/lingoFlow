/**
 * @jest-environment node
 */

jest.mock('@/lib/server/composition', () => {
  const actual = jest.requireActual('@/lib/server/composition')
  return { ...actual, getContainer: jest.fn() }
})

import { POST } from '../route'
import * as composition from '@/lib/server/composition'
import { createContainer } from '@/lib/server/composition'
import type { Container } from '@/lib/server/composition'
import { ALLOWED_TRANSCRIPT_FORMATS } from '@/lib/api-schemas'
import type { NextRequest } from 'next/server'

let container: Container

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

beforeEach(() => {
  container = createContainer(':memory:')
  ;(composition.getContainer as jest.Mock).mockReturnValue(container)
})

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('POST /api/videos/import', () => {
  it('exports ALLOWED_TRANSCRIPT_FORMATS with srt, vtt, txt', () => {
    expect(ALLOWED_TRANSCRIPT_FORMATS).toEqual(['srt', 'vtt', 'txt'])
  })

  it('returns 400 when no video file is provided', async () => {
    const transcriptFile = new File(['content'], 'transcript.srt', { type: 'text/plain' })
    const fd = makeFormData({ transcript: transcriptFile })
    const res = await POST(makeRequest(fd) as unknown as NextRequest)
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
    const res = await POST(makeRequest(fd) as unknown as NextRequest)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Invalid file extension/)
  })

  it('returns 201 and inserts video into DB on valid local upload', async () => {
    const fd = makeLocalFormData({ tags: 'french, beginner', author: 'Local Author' })
    const res = await POST(makeRequest(fd) as unknown as NextRequest)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.title).toBe('My Local Video')
    expect(body.author_name).toBe('Local Author')
    expect(body.tags).toEqual(['french', 'beginner'])
    expect(body.transcript_format).toBe('srt')
    const stored = container.videoStore.getById(body.id)
    expect(stored).toBeDefined()
    expect(stored?.title).toBe('My Local Video')
  })

  it('returns 400 when video file is present but title is missing', async () => {
    const videoContent = Buffer.from('data')
    const videoFile = Object.assign(
      new File([videoContent], 'video.mp4', { type: 'video/mp4' }),
      { arrayBuffer: async () => videoContent.buffer }
    )
    const transcriptFile = new File(['content'], 'transcript.srt', { type: 'text/plain' })
    const fd = makeFormData({ video: videoFile, transcript: transcriptFile })
    const res = await POST(makeRequest(fd) as unknown as NextRequest)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Title is required/)
  })

  it('returns 201 with empty tags when no tags provided for local upload', async () => {
    const fd = makeLocalFormData()
    const res = await POST(makeRequest(fd) as unknown as NextRequest)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.tags).toEqual([])
  })

  it('returns 201 with empty author_name when no author provided', async () => {
    const fd = makeLocalFormData()
    const res = await POST(makeRequest(fd) as unknown as NextRequest)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.author_name).toBe('')
  })

  it('returns 400 when video MIME type is not allowed', async () => {
    const videoContent = Buffer.from('data')
    const videoFile = Object.assign(
      new File([videoContent], 'my-video.avi', { type: 'video/avi' }),
      { arrayBuffer: async () => videoContent.buffer }
    )
    const transcriptFile = new File(['content'], 'transcript.srt', { type: 'text/plain' })
    const fd = makeFormData({ video: videoFile, title: 'Test', transcript: transcriptFile })
    const res = await POST(makeRequest(fd) as unknown as NextRequest)
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
    const res = await POST(makeRequest(fd) as unknown as NextRequest)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/500 MB/)
  })

  it('returns 201 for WebM videos', async () => {
    const videoContent = Buffer.from('data')
    const webmFile = Object.assign(
      new File([videoContent], 'my-video.webm', { type: 'video/webm' }),
      { arrayBuffer: async () => videoContent.buffer }
    )
    const fd = makeLocalFormData({ video: webmFile, title: 'WebM Video' })
    const res = await POST(makeRequest(fd) as unknown as NextRequest)
    expect(res.status).toBe(201)
  })

  it('returns 201 with thumbnail_path included in response when post-import task generates one', async () => {
    // Register a mock post-import task that simulates thumbnail generation
    const fakeTask = {
      run: jest.fn().mockResolvedValue({ thumbnail_path: '/data/thumbnails/test-id.jpg' }),
    }
    container.videoService.registerPostImportTask(fakeTask)

    const fd = makeLocalFormData({ title: 'Video with Thumbnail' })
    const res = await POST(makeRequest(fd) as unknown as NextRequest)

    expect(res.status).toBe(201)
    const body = await res.json()
    // The critical assertion: response includes post-import derived field
    expect(body.thumbnail_path).toBe('/data/thumbnails/test-id.jpg')
  })
})
