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
  const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/

  if (videoIdPattern.test(url)) {
    return url
  }

  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.toLowerCase()

    if (hostname === 'youtu.be' || hostname === 'www.youtu.be') {
      const videoId = parsedUrl.pathname.slice(1).split('/')[0]
      return videoIdPattern.test(videoId) ? videoId : null
    }

    if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
      if (parsedUrl.pathname === '/watch') {
        const videoId = parsedUrl.searchParams.get('v')
        return videoId && videoIdPattern.test(videoId) ? videoId : null
      }
    }
  } catch {
    return null
  }

  return null
}

function parseYoutubeUrl(url: string): URL | null {
  try {
    const parsedUrl = new URL(url)
    const validHosts = new Set([
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'youtu.be',
      'www.youtu.be',
    ])

    return validHosts.has(parsedUrl.hostname) ? parsedUrl : null
  } catch {
    return null
  }
}

export async function fetchYoutubeMetadata(url: string): Promise<YoutubeMetadata> {
  const parsedUrl = parseYoutubeUrl(url)

  if (!parsedUrl) {
    throw new YoutubeMetadataError('Invalid YouTube URL')
  }

  const normalizedUrl = parsedUrl.toString()
  const videoId = extractYoutubeId(normalizedUrl)

  if (!videoId) {
    throw new YoutubeMetadataError('Invalid YouTube URL')
  }

  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`
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
