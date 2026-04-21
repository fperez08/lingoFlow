import { NextResponse } from 'next/server'
import { getContainer } from '@/lib/server/composition'
import { UpdateVocabRequestSchema } from '@/lib/api-schemas'

export const runtime = 'nodejs'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ word: string }> }
) {
  try {
    const { word } = await params
    const decoded = decodeURIComponent(word).toLowerCase()

    const body = await request.json() as unknown
    const result = UpdateVocabRequestSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { vocabStore } = getContainer()
    const entry = vocabStore.upsert(decoded, result.data.status)
    return NextResponse.json(entry)
  } catch (error) {
    console.error('PATCH vocabulary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
