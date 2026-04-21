/**
 * @jest-environment node
 */

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}))

jest.mock('@/lib/server/composition', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual = jest.requireActual('@/lib/server/composition')
  return { ...actual, getContainer: jest.fn() }
})

import * as composition from '@/lib/server/composition'
import { createContainer } from '@/lib/server/composition'
import type { Container } from '@/lib/server/composition'
import type { InsertVideoParams } from '@/lib/videos'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fsMock = require('fs') as { readFileSync: jest.Mock; existsSync: jest.Mock }

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require('../route') as { GET: typeof import('../route').GET }

let container: Container

function makeVideoParams(overrides: Partial<InsertVideoParams> = {}): InsertVideoParams {
  return {
    id: 'video-1',
    title: 'Test',
    author_name: '',
    thumbnail_url: '',
    transcript_path: '',
    transcript_format: 'srt',
    tags: [],
    source_type: 'local',
    thumbnail_path: '/data/thumbnails/video-1.jpg',
    ...overrides,
  }
}

function makeRequest(): Request {
  return {} as unknown as Request
}

beforeEach(() => {
  container = createContainer(':memory:')
  ;(composition.getContainer as jest.Mock).mockReturnValue(container)
})

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('GET /api/videos/[id]/thumbnail', () => {
  it('returns 404 when video not found', async () => {
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 404 when thumbnail_path is null', async () => {
    container.videoStore.insert(makeVideoParams({ thumbnail_path: null }))
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 404 when thumbnail file cannot be read', async () => {
    container.videoStore.insert(makeVideoParams())
    fsMock.readFileSync.mockImplementation(() => { throw new Error('ENOENT') })
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 200 with image/jpeg content-type when thumbnail exists', async () => {
    container.videoStore.insert(makeVideoParams())
    fsMock.readFileSync.mockReturnValue(Buffer.from('fake-jpeg-data'))
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/jpeg')
  })

  it('includes cache-control header', async () => {
    container.videoStore.insert(makeVideoParams())
    fsMock.readFileSync.mockReturnValue(Buffer.from('fake-jpeg-data'))
    const res = await GET(makeRequest(), { params: Promise.resolve({ id: 'video-1' }) })
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  })
})
