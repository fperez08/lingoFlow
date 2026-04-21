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

let container: Container

beforeEach(() => {
  container = createContainer(':memory:')
  ;(composition.getContainer as jest.Mock).mockReturnValue(container)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('GET /api/vocabulary', () => {
  it('returns all vocabulary entries as JSON', async () => {
    container.vocabStore.upsert('ephemeral', 'new')
    container.vocabStore.upsert('resilient', 'mastered')

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)
    expect(body.find((e: { word: string }) => e.word === 'ephemeral')?.status).toBe('new')
    expect(body.find((e: { word: string }) => e.word === 'resilient')?.status).toBe('mastered')
  })

  it('returns empty array when no vocabulary entries', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns 500 on store error', async () => {
    jest.spyOn(container.vocabStore, 'getAll').mockImplementation(() => {
      throw new Error('db error')
    })
    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Internal server error')
  })
})
