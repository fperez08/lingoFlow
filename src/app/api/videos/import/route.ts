import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { fetchYoutubeMetadata } from '@/lib/youtube'

const ALLOWED_EXTENSIONS = ['srt', 'vtt', 'txt']

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = sessionData.session.user.id

    const formData = await request.formData()
    const youtubeUrlValue = formData.get('youtube_url')
    const transcriptFileValue = formData.get('transcript')
    const tagsValue = formData.get('tags')

    // Validate inputs
    if (typeof youtubeUrlValue !== 'string' || youtubeUrlValue.trim() === '') {
      return NextResponse.json(
        { error: 'Missing or invalid field: youtube_url' },
        { status: 400 }
      )
    }

    if (!(transcriptFileValue instanceof File)) {
      return NextResponse.json(
        { error: 'Missing or invalid field: transcript' },
        { status: 400 }
      )
    }

    if (tagsValue !== null && typeof tagsValue !== 'string') {
      return NextResponse.json(
        { error: 'Invalid field: tags' },
        { status: 400 }
      )
    }

    const youtubeUrl = youtubeUrlValue
    const transcriptFile = transcriptFileValue
    const tagsString = tagsValue ?? ''
    // Validate transcript file extension
    const fileExtension = getFileExtension(transcriptFile.name)
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      )
    }

    // Fetch YouTube metadata
    let youtubeMetadata
    try {
      youtubeMetadata = await fetchYoutubeMetadata(youtubeUrl)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to fetch YouTube metadata' },
        { status: 422 }
      )
    }

    // Generate video ID
    const videoId = crypto.randomUUID()
    const storagePath = `${userId}/${videoId}.${fileExtension}`

    // Upload transcript to storage
    const fileBuffer = await transcriptFile.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('transcripts')
      .upload(storagePath, fileBuffer, {
        contentType: transcriptFile.type || 'text/plain',
      })

    if (uploadError) {
      return NextResponse.json(
        { error: 'Failed to upload transcript file' },
        { status: 500 }
      )
    }

    // Parse tags
    const tags = tagsString
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    // Insert video record (use the same videoId as the primary key)
    const { data: video, error: insertError } = await supabase
      .from('videos')
      .insert({
        id: videoId,
        user_id: userId,
        youtube_url: youtubeUrl,
        youtube_id: youtubeMetadata.youtube_id,
        title: youtubeMetadata.title,
        author_name: youtubeMetadata.author_name,
        thumbnail_url: youtubeMetadata.thumbnail_url,
        transcript_path: storagePath,
        transcript_format: fileExtension,
        tags,
      })
      .select()
      .single()

    if (insertError) {
      // Clean up the uploaded transcript to avoid orphaned storage objects
      const { error: removeError } = await supabase.storage
        .from('transcripts')
        .remove([storagePath])
      if (removeError) {
        console.error('Failed to clean up orphaned transcript:', removeError)
      }
      return NextResponse.json(
        { error: 'Failed to save video record' },
        { status: 500 }
      )
    }

    return NextResponse.json(video, { status: 201 })
  } catch (error) {
    console.error('Import API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
