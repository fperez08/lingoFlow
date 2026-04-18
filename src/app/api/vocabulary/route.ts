import { NextResponse } from 'next/server'
import { vocabStore } from '@/lib/server/composition'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const entries = vocabStore.getAll()
    return NextResponse.json(entries)
  } catch (error) {
    console.error('GET vocabulary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
