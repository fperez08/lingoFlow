/**
 * @jest-environment node
 */
import { POST } from '../route'

// Mock the Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue(
            JSON.stringify({
              definition: 'Test definition',
              partOfSpeech: 'noun',
              example: 'Test example',
            })
          ),
        },
      }),
    }),
  })),
}))

describe('/api/dictionary/define', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY
  })

  it('should return a definition for a valid word and context', async () => {
    const request = new Request('http://localhost:3000/api/dictionary/define', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: 'serendipity',
        contextSentence: 'It was pure serendipity that we met',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('definition')
    expect(data.definition).toBe('Test definition')
    expect(data.partOfSpeech).toBe('noun')
    expect(data.example).toBe('Test example')
  })

  it('should return 400 for missing word', async () => {
    const request = new Request('http://localhost:3000/api/dictionary/define', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contextSentence: 'It was pure serendipity that we met',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data).toHaveProperty('error')
    expect(data.error).toBe('Invalid request')
  })

  it('should return 400 for missing context sentence', async () => {
    const request = new Request('http://localhost:3000/api/dictionary/define', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: 'serendipity',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  it('should return 503 when GOOGLE_GEMINI_API_KEY is not set', async () => {
    delete process.env.GOOGLE_GEMINI_API_KEY

    const request = new Request('http://localhost:3000/api/dictionary/define', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: 'serendipity',
        contextSentence: 'It was pure serendipity that we met',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(503)

    const data = await response.json()
    expect(data.error).toBe('AI service not configured')
  })

  it('should handle malformed JSON response from Gemini', async () => {
    jest.clearAllMocks()
    jest.mocked(jest.requireMock('@google/generative-ai').GoogleGenerativeAI).mockImplementationOnce(
      () => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: jest.fn().mockReturnValue('Invalid JSON'),
            },
          }),
        }),
      }) as any
    )
    process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key'

    const request = new Request('http://localhost:3000/api/dictionary/define', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: 'serendipity',
        contextSentence: 'It was pure serendipity that we met',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('definition')
    expect(data.definition).toBe('Invalid JSON')
  })
})
