import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'

const RequestSchema = z.object({
  word: z.string().min(1, 'Word is required'),
  contextSentence: z.string().min(1, 'Context sentence is required'),
})

interface DefinitionResponse {
  definition: string
  partOfSpeech?: string
  example?: string
}

async function generateDefinition(word: string, contextSentence: string): Promise<DefinitionResponse> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY not configured')
  }

  const client = new GoogleGenerativeAI(apiKey)
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `You are a language learning assistant. Generate a clear, concise definition for the word "${word}" based on how it's used in this context: "${contextSentence}"

Respond in valid JSON format only with these fields:
- definition: (string) A concise definition of the word as used in the context
- partOfSpeech: (string, optional) The part of speech (noun, verb, adjective, etc.)
- example: (string, optional) A usage example related to the context

Example response format:
{"definition": "example text", "partOfSpeech": "noun", "example": "example text"}

Return ONLY valid JSON, no markdown or extra text.`

  const result = await model.generateContent(prompt)
  const responseText = result.response.text()

  // Parse the JSON response
  let parsed: DefinitionResponse
  try {
    parsed = JSON.parse(responseText)
  } catch {
    // Fallback if JSON parsing fails
    parsed = {
      definition: responseText,
    }
  }

  return parsed
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { word, contextSentence } = RequestSchema.parse(body)

    const definition = await generateDefinition(word, contextSentence)

    return NextResponse.json(definition)
  } catch (error) {
    console.error('Dictionary define error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues[0].message },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('GOOGLE_GEMINI_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate definition' },
      { status: 500 }
    )
  }
}
