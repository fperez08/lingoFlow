/**
 * @jest-environment node
 */

jest.mock('@/lib/server/composition', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual = jest.requireActual('@/lib/server/composition')
  return { ...actual, getContainer: jest.fn() }
})

import { GET } from '../route'
import * as composition from '@/lib/server/composition'
import { createContainer } from '@/lib/server/composition'
import type { Container } from '@/lib/server/composition'
import type { InsertVideoParams } from '@/lib/videos'

let container: Container

function makeVideoParams(overrides: Partial<InsertVideoParams> = {}): InsertVideoParams {
  return {
    id: 'v1',
    title: 'Video 1',
    author_name: 'Author 1',
    thumbnail_url: '',
    transcript_path: '/transcripts/v1.srt',
    transcript_format: 'srt',
    tags: ['tag1'],
    source_type: 'local',
    ...overrides,
  }
}

beforeEach(() => {
  container = createContainer(':memory:')
  ;(composition.getContainer as jest.Mock).mockReturnValue(container)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('GET /api/videos', () => {
  it('returns 200 with empty array when no videos', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual([])
  })

  it('returns 200 with videos from DB', async () => {
    container.videoStore.insert(makeVideoParams())
    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe('v1')
    expect(body[0].tags).toEqual(['tag1'])
  })

  it('returns 500 if store.list() throws', async () => {
    jest.spyOn(container.videoStore, 'list').mockImplementation(() => {
      throw new Error('DB error')
    })
    const response = await GET()
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Internal server error')
  })
})
