export interface YoutubeMetadata {
  title: string
  author_name: string
  thumbnail_url: string
  youtube_id: string
}

/**
 * Canned responses returned when E2E_STUB_YOUTUBE=true.
 * Keyed by YouTube video ID; the fallback entry handles any unknown ID.
 */
export const STUB_VIDEOS: Record<string, Omit<YoutubeMetadata, 'youtube_id'>> = {
  dQw4w9WgXcQ: {
    title: 'Rick Astley - Never Gonna Give You Up',
    author_name: 'Rick Astley',
    thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg',
  },
  jNQXAC9IVRw: {
    title: 'Me at the zoo',
    author_name: 'jawed',
    thumbnail_url: 'https://img.youtube.com/vi/jNQXAC9IVRw/0.jpg',
  },
  kJQP7kiw5Fk: {
    title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
    author_name: 'Luis Fonsi',
    thumbnail_url: 'https://img.youtube.com/vi/kJQP7kiw5Fk/0.jpg',
  },
}

const STUB_FALLBACK: Omit<YoutubeMetadata, 'youtube_id'> = {
  title: 'Stub Video',
  author_name: 'Stub Author',
  thumbnail_url: '',
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

  const normalizedUrl =
    url.startsWith('youtu.be/') || url.startsWith('www.youtu.be/')
      ? `https://${url}`
      : url

  try {
    const parsedUrl = new URL(normalizedUrl)
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

  if (process.env.E2E_STUB_YOUTUBE === 'true') {
    const stub = STUB_VIDEOS[videoId] ?? {
      ...STUB_FALLBACK,
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/0.jpg`,
    }
    return { ...stub, youtube_id: videoId }
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
