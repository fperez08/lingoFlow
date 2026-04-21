import { FetchApiClient, queryKeys } from '../api-client'

const mockVideo = {
  id: 'video-1',
  title: 'Test Video',
  author_name: 'Author',
  thumbnail_url: '',
  transcript_path: 'transcripts/video-1.srt',
  transcript_format: 'srt',
  tags: ['french'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  source_type: 'local' as const,
}

function mockFetch(response: Partial<Response>) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
    ...response,
  })
}

afterEach(() => {
  jest.resetAllMocks()
})

describe('queryKeys', () => {
  it('videos() returns stable key', () => {
    expect(queryKeys.videos()).toEqual(['videos'])
  })

  it('video(id) returns scoped key', () => {
    expect(queryKeys.video('abc')).toEqual(['videos', 'abc'])
  })

  it('transcript(id) returns scoped key', () => {
    expect(queryKeys.transcript('abc')).toEqual(['transcript', 'abc'])
  })
})

describe('FetchApiClient', () => {
  let client: FetchApiClient

  beforeEach(() => {
    client = new FetchApiClient()
  })

  describe('listVideos()', () => {
    it('calls GET /api/videos', async () => {
      mockFetch({ json: async () => [mockVideo] })
      const result = await client.listVideos()
      expect(global.fetch).toHaveBeenCalledWith('/api/videos')
      expect(result).toEqual([mockVideo])
    })

    it('throws on non-ok response', async () => {
      mockFetch({ ok: false, status: 500 })
      await expect(client.listVideos()).rejects.toThrow('Failed to fetch videos')
    })
  })

  describe('getVideo(id)', () => {
    it('calls GET /api/videos/:id', async () => {
      mockFetch({ json: async () => mockVideo })
      const result = await client.getVideo('video-1')
      expect(global.fetch).toHaveBeenCalledWith('/api/videos/video-1')
      expect(result).toEqual(mockVideo)
    })

    it('throws "Video not found" on 404', async () => {
      mockFetch({ ok: false, status: 404 })
      await expect(client.getVideo('missing')).rejects.toThrow('Video not found: missing')
    })

    it('throws on other non-ok responses', async () => {
      mockFetch({ ok: false, status: 500 })
      await expect(client.getVideo('video-1')).rejects.toThrow('Failed to fetch video: video-1')
    })
  })

  describe('getTranscript(id)', () => {
    it('calls GET /api/videos/:id/transcript and unwraps cues', async () => {
      const cues = [{ index: 1, startTime: '00:00:00,000', endTime: '00:00:02,000', text: 'Hello' }]
      mockFetch({ json: async () => ({ cues }) })
      const result = await client.getTranscript('video-1')
      expect(global.fetch).toHaveBeenCalledWith('/api/videos/video-1/transcript')
      expect(result).toEqual(cues)
    })

    it('returns empty array when cues is missing', async () => {
      mockFetch({ json: async () => ({}) })
      const result = await client.getTranscript('video-1')
      expect(result).toEqual([])
    })

    it('throws on non-ok response', async () => {
      mockFetch({ ok: false, status: 500 })
      await expect(client.getTranscript('video-1')).rejects.toThrow(
        'Failed to fetch transcript for: video-1'
      )
    })
  })

  describe('importVideo(form)', () => {
    it('calls POST /api/videos/import with FormData', async () => {
      mockFetch({ json: async () => mockVideo })
      const form = new FormData()
      form.append('title', 'Test')
      const result = await client.importVideo(form)
      expect(global.fetch).toHaveBeenCalledWith('/api/videos/import', {
        method: 'POST',
        body: form,
      })
      expect(result).toEqual(mockVideo)
    })

    it('throws on non-ok response', async () => {
      mockFetch({ ok: false, status: 400 })
      await expect(client.importVideo(new FormData())).rejects.toThrow('Failed to import video')
    })
  })

  describe('updateVideo(id, form)', () => {
    it('calls PATCH /api/videos/:id with FormData', async () => {
      mockFetch({ json: async () => mockVideo })
      const form = new FormData()
      form.append('tags', '["french"]')
      const result = await client.updateVideo('video-1', form)
      expect(global.fetch).toHaveBeenCalledWith('/api/videos/video-1', {
        method: 'PATCH',
        body: form,
      })
      expect(result).toEqual(mockVideo)
    })

    it('throws on non-ok response', async () => {
      mockFetch({ ok: false, status: 404 })
      await expect(client.updateVideo('missing', new FormData())).rejects.toThrow(
        'Failed to update video: missing'
      )
    })
  })

  describe('deleteVideo(id)', () => {
    it('calls DELETE /api/videos/:id', async () => {
      mockFetch({ ok: true })
      await client.deleteVideo('video-1')
      expect(global.fetch).toHaveBeenCalledWith('/api/videos/video-1', { method: 'DELETE' })
    })

    it('throws on non-ok response', async () => {
      mockFetch({ ok: false, status: 404 })
      await expect(client.deleteVideo('missing')).rejects.toThrow('Failed to delete video: missing')
    })
  })
})
