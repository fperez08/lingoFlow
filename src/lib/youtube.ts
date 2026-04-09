export interface YoutubeMetadata {
  title: string
  author_name: string
  thumbnail_url: string
  youtube_id: string
}

export class YoutubeMetadataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'YoutubeMetadataError'
  }
}

export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

export async function fetchYoutubeMetadata(url: string): Promise<YoutubeMetadata> {
  const videoId = extractYoutubeId(url)

  if (!videoId) {
    throw new YoutubeMetadataError('Invalid YouTube URL')
  }

  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    )

    if (!response.ok) {
      throw new YoutubeMetadataError('Could not fetch YouTube metadata')
    }

    const data = await response.json()

    return {
      title: data.title,
      author_name: data.author_name,
      thumbnail_url: data.thumbnail_url,
      youtube_id: videoId,
    }
  } catch (error) {
    if (error instanceof YoutubeMetadataError) {
      throw error
    }
    throw new YoutubeMetadataError('Failed to fetch YouTube metadata')
  }
}
