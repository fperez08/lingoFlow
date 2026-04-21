/**
 * @jest-environment node
 */

jest.mock('@/lib/server/composition', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual = jest.requireActual('@/lib/server/composition')
  return { ...actual, getContainer: jest.fn() }
})

import { DELETE, PATCH, GET } from '../route'
import * as composition from '@/lib/server/composition'
import { createContainer } from '@/lib/server/composition'
import type { Container } from '@/lib/server/composition'
import type { InsertVideoParams } from '@/lib/videos'

let container: Container

function makeVideoParams(overrides: Partial<InsertVideoParams> = {}): InsertVideoParams {
  return {
    id: 'video-1',
    title: 'Test Video',
    author_name: 'Author',
    thumbnail_url: '',
    transcript_path: '/transcripts/video-1.srt',
    transcript_format: 'srt',
    tags: ['spanish'],
    source_type: 'local',
    local_video_path: '/videos/video-1.mp4',
    local_video_filename: 'video-1.mp4',
    ...overrides,
  }
}

function makeRequest(): Request {
  return { method: 'DELETE', url: 'http://localhost/api/videos/video-1' } as unknown as Request
}

function makePatchRequest(fields: Record<string, unknown>): Request {
  const mockFormData = {
    get: jest.fn((key: string) => fields[key] ?? null),
  }
  return {
    method: 'PATCH',
    url: 'http://localhost/api/videos/video-1',
    formData: jest.fn().mockResolvedValue(mockFormData),
  } as unknown as Request
}

beforeEach(() => {
  container = createContainer(':memory:')
  ;(composition.getContainer as jest.Mock).mockReturnValue(container)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('DELETE /api/videos/[id]', () => {
  it('returns 404 if video not found', async () => {
    const response = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(404)
  })

  it('returns 204 on successful delete', async () => {
    container.videoStore.insert(makeVideoParams())
    const response = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(204)
  })

  it('removes video from DB after delete', async () => {
    container.videoStore.insert(makeVideoParams())
    await DELETE(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(container.videoStore.getById('video-1')).toBeUndefined()
  })
})

describe('PATCH /api/videos/[id]', () => {
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
    const response = await PATCH(makePatchRequest({ tags: JSON.stringify(['spanish']) }), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(404)
  })

  it('returns 200 with updated video on tags-only update', async () => {
    container.videoStore.insert(makeVideoParams({ tags: ['old'] }))
    const response = await PATCH(
      makePatchRequest({ tags: JSON.stringify(['spanish', 'advanced']) }),
      { params: Promise.resolve({ id: 'video-1' }) }
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.tags).toEqual(['spanish', 'advanced'])
  })

  it('persists tag update to DB', async () => {
    container.videoStore.insert(makeVideoParams({ tags: ['old'] }))
    await PATCH(
      makePatchRequest({ tags: JSON.stringify(['new-tag']) }),
      { params: Promise.resolve({ id: 'video-1' }) }
    )
    expect(container.videoStore.getById('video-1')?.tags).toEqual(['new-tag'])
  })

  it('returns 400 for invalid transcript extension', async () => {
    container.videoStore.insert(makeVideoParams())
    const file = { name: 'subtitles.pdf', size: 7, arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('content')) } as unknown as File
    const response = await PATCH(makePatchRequest({ tags: JSON.stringify(['spanish']), transcript: file }), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(400)
  })

  it('returns 200 on transcript replacement with valid extension', async () => {
    container.videoStore.insert(makeVideoParams())
    const file = { name: 'subtitles.srt', size: 7, arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('content')) } as unknown as File
    const response = await PATCH(
      makePatchRequest({ tags: JSON.stringify(['spanish']), transcript: file }),
      { params: Promise.resolve({ id: 'video-1' }) }
    )
    expect(response.status).toBe(200)
  })
})

describe('GET /api/videos/[id]', () => {
  it('returns 404 if video not found', async () => {
    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(404)
  })

  it('returns 200 with video data when found', async () => {
    container.videoStore.insert(makeVideoParams())
    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.id).toBe('video-1')
    expect(body.title).toBe('Test Video')
  })
})

