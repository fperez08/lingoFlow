/**
 * @jest-environment node
 */

jest.mock('@/lib/server/composition', () => {
  const actual = jest.requireActual('@/lib/server/composition')
  return { ...actual, getContainer: jest.fn() }
})

import { PATCH } from '../route'
import * as composition from '@/lib/server/composition'
import { createContainer } from '@/lib/server/composition'
import type { Container } from '@/lib/server/composition'

let container: Container

function makeRequest(body: unknown): Request {
  return {
    method: 'PATCH',
    url: 'http://localhost/api/vocabulary/ephemeral',
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Request
}

beforeEach(() => {
  container = createContainer(':memory:')
  ;(composition.getContainer as jest.Mock).mockReturnValue(container)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('PATCH /api/vocabulary/[word]', () => {
  it('upserts and returns the updated entry', async () => {
    const res = await PATCH(makeRequest({ status: 'mastered' }), {
      params: Promise.resolve({ word: 'ephemeral' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.word).toBe('ephemeral')
    expect(body.status).toBe('mastered')
    expect(container.vocabStore.getByWord('ephemeral')?.status).toBe('mastered')
  })

  it('saves definition without changing status', async () => {
    const res = await PATCH(makeRequest({ definition: 'lasting a very short time' }), {
      params: Promise.resolve({ word: 'ephemeral' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.word).toBe('ephemeral')
    expect(body.definition).toBe('lasting a very short time')
    expect(container.vocabStore.getByWord('ephemeral')?.definition).toBe('lasting a very short time')
  })

  it('saves both status and definition', async () => {
    const res = await PATCH(
      makeRequest({
        status: 'learning',
        definition: 'lasting a very short time',
      }),
      {
        params: Promise.resolve({ word: 'ephemeral' }),
      }
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.word).toBe('ephemeral')
    expect(body.status).toBe('learning')
    expect(body.definition).toBe('lasting a very short time')
  })

  it('decodes and lowercases the word param', async () => {
    const res = await PATCH(makeRequest({ status: 'new' }), {
      params: Promise.resolve({ word: 'Hello%20World' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.word).toBe('hello world')
    expect(container.vocabStore.getByWord('hello world')?.status).toBe('new')
  })

  it('returns 400 for invalid status', async () => {
    const res = await PATCH(makeRequest({ status: 'invalid' }), {
      params: Promise.resolve({ word: 'ephemeral' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 500 on store error', async () => {
    jest.spyOn(container.vocabStore, 'upsert').mockImplementation(() => {
      throw new Error('db error')
    })

    const res = await PATCH(makeRequest({ status: 'mastered' }), {
      params: Promise.resolve({ word: 'ephemeral' }),
    })

    expect(res.status).toBe(500)
  })
})
