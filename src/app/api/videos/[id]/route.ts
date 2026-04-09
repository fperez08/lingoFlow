// @jest-environment node
import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: video } = await supabase
    .from('videos')
    .select('*')
    .eq('id', id)
    .single()

  if (!video || video.user_id !== user.id) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  if (video.transcript_path) {
    await supabase.storage.from('transcripts').remove([video.transcript_path])
  }

  await supabase.from('videos').delete().eq('id', id)

  return new NextResponse(null, { status: 204 })
}
