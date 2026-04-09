import { fetchYoutubeMetadata, extractYoutubeId, YoutubeMetadataError } from '../youtube'

describe('extractYoutubeId', () => {
  it('extracts video ID from youtube.com/watch?v= format', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    expect(extractYoutubeId(url)).toBe('dQw4w9WgXcQ')
  })

  it('extracts video ID from youtu.be/ format', () => {
    const url = 'https://youtu.be/dQw4w9WgXcQ'
    expect(extractYoutubeId(url)).toBe('dQw4w9WgXcQ')
  })

  it('extracts video ID from short youtu.be URL', () => {
    const url = 'youtu.be/dQw4w9WgXcQ'
    expect(extractYoutubeId(url)).toBe('dQw4w9WgXcQ')
  })

  it('returns null for non-YouTube URLs', () => {
    const url = 'https://www.example.com'
    expect(extractYoutubeId(url)).toBeNull()
  })

  it('returns null for malformed YouTube URLs', () => {
    const url = 'https://www.youtube.com/watch?v=invalid'
    expect(extractYoutubeId(url)).toBeNull()
  })

  it('accepts raw video ID', () => {
    expect(extractYoutubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })
})

describe('fetchYoutubeMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns metadata for a valid YouTube URL', async () => {
    const mockResponse = {
      title: 'Test Video',
      author_name: 'Test Author',
      thumbnail_url: 'https://example.com/thumb.jpg',
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await fetchYoutubeMetadata('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    expect(result).toEqual({
      title: 'Test Video',
      author_name: 'Test Author',
      thumbnail_url: 'https://example.com/thumb.jpg',
      youtube_id: 'dQw4w9WgXcQ',
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ&format=json'
    )
  })

  it('throws YoutubeMetadataError for invalid YouTube URL without calling fetch', async () => {
    global.fetch = jest.fn()

    await expect(fetchYoutubeMetadata('https://www.example.com')).rejects.toThrow(
      YoutubeMetadataError
    )

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('throws YoutubeMetadataError when oEmbed returns 404', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    })

    await expect(fetchYoutubeMetadata('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).rejects.toThrow(
      YoutubeMetadataError
    )
  })

  it('throws YoutubeMetadataError on network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    await expect(fetchYoutubeMetadata('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).rejects.toThrow(
      YoutubeMetadataError
    )
  })

  it('handles youtu.be shortened URLs', async () => {
    const mockResponse = {
      title: 'Short URL Video',
      author_name: 'Author',
      thumbnail_url: 'https://example.com/thumb.jpg',
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await fetchYoutubeMetadata('https://youtu.be/dQw4w9WgXcQ')

    expect(result).toEqual({
      title: 'Short URL Video',
      author_name: 'Author',
      thumbnail_url: 'https://example.com/thumb.jpg',
      youtube_id: 'dQw4w9WgXcQ',
    })
  })
})
