import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createSupabaseServer()

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = sessionData.session.user.id

    const { data: videos, error } = await supabase
      .from('videos')
      .select('id, title, tags, transcript_path, transcript_format, created_at, updated_at, author_name, thumbnail_url, youtube_url')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
    }

    return NextResponse.json(videos)
  } catch (error) {
    console.error('Videos API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
