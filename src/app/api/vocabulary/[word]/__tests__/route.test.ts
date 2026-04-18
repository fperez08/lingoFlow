// @jest-environment node
import { PATCH } from '../route'
import { vocabStore } from '@/lib/server/composition'

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
    async json() { return this.body }
  },
}))

jest.mock('@/lib/server/composition', () => ({
  vocabStore: {
    upsert: jest.fn(),
  },
}))

const mockVocabStore = vocabStore as jest.Mocked<typeof vocabStore>

function makeRequest(body: unknown): Request {
  return {
    method: 'PATCH',
    url: 'http://localhost/api/vocabulary/ephemeral',
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Request
}

describe('PATCH /api/vocabulary/[word]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('upserts and returns the updated entry', async () => {
    const entry = { word: 'ephemeral', status: 'mastered' }
    mockVocabStore.upsert.mockReturnValue(entry)

    const res = await PATCH(makeRequest({ status: 'mastered' }), {
      params: Promise.resolve({ word: 'ephemeral' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(entry)
    expect(mockVocabStore.upsert).toHaveBeenCalledWith('ephemeral', 'mastered')
  })

  it('decodes and lowercases the word param', async () => {
    const entry = { word: 'hello world', status: 'new' }
    mockVocabStore.upsert.mockReturnValue(entry)

    const res = await PATCH(makeRequest({ status: 'new' }), {
      params: Promise.resolve({ word: 'Hello%20World' }),
    })

    expect(res.status).toBe(200)
    expect(mockVocabStore.upsert).toHaveBeenCalledWith('hello world', 'new')
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
    mockVocabStore.upsert.mockImplementation(() => {
      throw new Error('db error')
    })

    const res = await PATCH(makeRequest({ status: 'mastered' }), {
      params: Promise.resolve({ word: 'ephemeral' }),
    })

    expect(res.status).toBe(500)
  })
})
