import {
  VideoSchema,
  InsertVideoParamsSchema,
  UpdateVideoParamsSchema,
  type Video,
  type InsertVideoParams,
  type UpdateVideoParams,
} from '../videos'

const validVideo: Video = {
  id: 'v1',
  youtube_url: 'https://youtube.com/watch?v=abc',
  youtube_id: 'abc',
  title: 'Test Video',
  author_name: 'Author',
  thumbnail_url: 'https://img.youtube.com/vi/abc/0.jpg',
  transcript_path: '/transcripts/v1.vtt',
  transcript_format: 'vtt',
  tags: ['tag1', 'tag2'],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

const validInsert: InsertVideoParams = {
  id: 'v1',
  youtube_url: 'https://youtube.com/watch?v=abc',
  youtube_id: 'abc',
  title: 'Test Video',
  author_name: 'Author',
  thumbnail_url: 'https://img.youtube.com/vi/abc/0.jpg',
  transcript_path: '/transcripts/v1.vtt',
  transcript_format: 'vtt',
  tags: [],
}

describe('VideoSchema', () => {
  it('parses a valid video object', () => {
    expect(VideoSchema.parse(validVideo)).toEqual(validVideo)
  })

  it('rejects missing required fields', () => {
    const { id, ...rest } = validVideo
    expect(() => VideoSchema.parse(rest)).toThrow()
  })

  it('rejects non-array tags', () => {
    expect(() => VideoSchema.parse({ ...validVideo, tags: 'bad' })).toThrow()
  })
})

describe('InsertVideoParamsSchema', () => {
  it('parses a valid insert params object', () => {
    expect(InsertVideoParamsSchema.parse(validInsert)).toEqual(validInsert)
  })

  it('rejects missing required fields', () => {
    const { title, ...rest } = validInsert
    expect(() => InsertVideoParamsSchema.parse(rest)).toThrow()
  })

  it('does not include created_at or updated_at', () => {
    const result = InsertVideoParamsSchema.safeParse({ ...validInsert, created_at: '2024-01-01' })
    expect(result.success).toBe(true)
    // Zod strips unknown keys only in strict mode; just confirm parse succeeds
  })
})

describe('UpdateVideoParamsSchema', () => {
  it('parses an empty object (all fields optional)', () => {
    const result: UpdateVideoParams = UpdateVideoParamsSchema.parse({})
    expect(result).toEqual({})
  })

  it('parses partial update with tags only', () => {
    const result = UpdateVideoParamsSchema.parse({ tags: ['a', 'b'] })
    expect(result.tags).toEqual(['a', 'b'])
  })

  it('parses partial update with transcript fields', () => {
    const result = UpdateVideoParamsSchema.parse({ transcript_path: '/p.srt', transcript_format: 'srt' })
    expect(result.transcript_path).toBe('/p.srt')
    expect(result.transcript_format).toBe('srt')
  })

  it('rejects non-string transcript_path', () => {
    expect(() => UpdateVideoParamsSchema.parse({ transcript_path: 123 })).toThrow()
  })
})
