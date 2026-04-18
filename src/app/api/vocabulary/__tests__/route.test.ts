// @jest-environment node
import { GET } from '../route'
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
    getAll: jest.fn(),
  },
}))

const mockVocabStore = vocabStore as jest.Mocked<typeof vocabStore>

describe('GET /api/vocabulary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns all vocabulary entries as JSON', async () => {
    const entries = [
      { word: 'ephemeral', status: 'new' },
      { word: 'resilient', status: 'mastered' },
    ]
    mockVocabStore.getAll.mockReturnValue(entries)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(entries)
  })

  it('returns 500 on store error', async () => {
    mockVocabStore.getAll.mockImplementation(() => {
      throw new Error('db error')
    })

    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Internal server error')
  })
})
