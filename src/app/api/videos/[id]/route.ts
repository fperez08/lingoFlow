// @jest-environment node
import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { getVideoById, deleteVideo } from '@/lib/videos'
import { deleteTranscript } from '@/lib/transcripts'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const video = getVideoById(id)
    if (!video) {
      return new NextResponse('Not Found', { status: 404 })
    }
    if (video.transcript_path) {
      deleteTranscript(video.transcript_path)
    }
    deleteVideo(id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('DELETE video error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServer()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const userId = session.user.id

  const formData = await request.formData()
  const tagsRaw = formData.get('tags') as string
  const tags: string[] = JSON.parse(tagsRaw)
  const transcriptFile = formData.get('transcript') as File | null

  const { data: existingVideo } = await supabase
    .from('videos')
    .select('transcript_path')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!existingVideo) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const updateObj: Record<string, unknown> = { tags }

  if (transcriptFile && transcriptFile.size > 0) {
    const ext = transcriptFile.name.split('.').pop()
    const newPath = `${userId}/${crypto.randomUUID()}.${ext}`
    await supabase.storage.from('transcripts').upload(newPath, transcriptFile)
    if (existingVideo.transcript_path) {
      await supabase.storage.from('transcripts').remove([existingVideo.transcript_path])
    }
    updateObj.transcript_path = newPath
    updateObj.transcript_format = ext
  }

  const { data: updatedVideo } = await supabase
    .from('videos')
    .update(updateObj)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  return NextResponse.json(updatedVideo, { status: 200 })
}

