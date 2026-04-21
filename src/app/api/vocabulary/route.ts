import { NextResponse } from 'next/server'
import { getContainer } from '@/lib/server/composition'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { vocabStore } = getContainer()
    const entries = vocabStore.getAll()
    return NextResponse.json(entries)
  } catch (error) {
    console.error('GET vocabulary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
