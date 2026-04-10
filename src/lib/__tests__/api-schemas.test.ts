import {
  ALLOWED_TRANSCRIPT_FORMATS,
  ImportVideoRequestSchema,
  UpdateVideoRequestSchema,
} from '../api-schemas'

describe('ALLOWED_TRANSCRIPT_FORMATS', () => {
  it('contains srt, vtt, and txt', () => {
    expect(ALLOWED_TRANSCRIPT_FORMATS).toEqual(['srt', 'vtt', 'txt'])
  })
})

describe('ImportVideoRequestSchema', () => {
  function makeFile(name: string, content = 'data'): File {
    return new File([content], name, { type: 'text/plain' })
  }

  it('parses valid input with tags', () => {
    const result = ImportVideoRequestSchema.safeParse({
      youtube_url: 'https://www.youtube.com/watch?v=abc123',
      transcript: makeFile('transcript.srt'),
      tags: 'language, english',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.youtube_url).toBe('https://www.youtube.com/watch?v=abc123')
      expect(result.data.tags).toBe('language, english')
      expect(result.data.transcript.name).toBe('transcript.srt')
    }
  })

  it('parses valid input without tags (defaults to empty string)', () => {
    const result = ImportVideoRequestSchema.safeParse({
      youtube_url: 'https://www.youtube.com/watch?v=abc123',
      transcript: makeFile('transcript.vtt'),
      tags: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toBe('')
    }
  })

  it('trims youtube_url whitespace', () => {
    const result = ImportVideoRequestSchema.safeParse({
      youtube_url: '  https://www.youtube.com/watch?v=abc123  ',
      transcript: makeFile('transcript.txt'),
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.youtube_url).toBe('https://www.youtube.com/watch?v=abc123')
    }
  })

  it('fails when youtube_url is empty', () => {
    const result = ImportVideoRequestSchema.safeParse({
      youtube_url: '   ',
      transcript: makeFile('transcript.srt'),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Missing required fields: youtube_url and transcript'
      )
    }
  })

  it('fails when transcript is not a File', () => {
    const result = ImportVideoRequestSchema.safeParse({
      youtube_url: 'https://www.youtube.com/watch?v=abc123',
      transcript: null,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Missing required fields: youtube_url and transcript'
      )
    }
  })

  it('fails for invalid transcript extension', () => {
    const result = ImportVideoRequestSchema.safeParse({
      youtube_url: 'https://www.youtube.com/watch?v=abc123',
      transcript: makeFile('transcript.pdf'),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Invalid file extension. Allowed: srt, vtt, txt'
      )
    }
  })

  it('fails when transcript filename has no extension', () => {
    const result = ImportVideoRequestSchema.safeParse({
      youtube_url: 'https://www.youtube.com/watch?v=abc123',
      transcript: makeFile(''),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/Invalid file extension/)
    }
  })

  it('fails when tags is a non-string (File)', () => {
    const result = ImportVideoRequestSchema.safeParse({
      youtube_url: 'https://www.youtube.com/watch?v=abc123',
      transcript: makeFile('transcript.srt'),
      tags: new File(['t'], 'tags.txt'),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid tags field')
    }
  })

  it('accepts all allowed extensions', () => {
    for (const ext of ALLOWED_TRANSCRIPT_FORMATS) {
      const result = ImportVideoRequestSchema.safeParse({
        youtube_url: 'https://www.youtube.com/watch?v=abc123',
        transcript: makeFile(`transcript.${ext}`),
      })
      expect(result.success).toBe(true)
    }
  })
})

describe('UpdateVideoRequestSchema', () => {
  function makeFile(name: string): File {
    return new File(['content'], name, { type: 'text/plain' })
  }

  function makeEmptyFile(name: string): File {
    return new File([], name, { type: 'application/octet-stream' })
  }

  it('parses valid tags JSON array', () => {
    const result = UpdateVideoRequestSchema.safeParse({
      tags: JSON.stringify(['spanish', 'advanced']),
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toEqual(['spanish', 'advanced'])
    }
  })

  it('parses empty tags array', () => {
    const result = UpdateVideoRequestSchema.safeParse({ tags: '[]' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toEqual([])
    }
  })

  it('fails when tags is missing (null)', () => {
    const result = UpdateVideoRequestSchema.safeParse({ tags: null })
    expect(result.success).toBe(false)
  })

  it('fails when tags is not a JSON array (object)', () => {
    const result = UpdateVideoRequestSchema.safeParse({ tags: '{"key":"val"}' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Tags must be a JSON array')
    }
  })

  it('fails when tags is invalid JSON', () => {
    const result = UpdateVideoRequestSchema.safeParse({ tags: 'not-json' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Tags must be a JSON array')
    }
  })

  it('fails when tags is a JSON string (not array)', () => {
    const result = UpdateVideoRequestSchema.safeParse({ tags: '"just-a-string"' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Tags must be a JSON array')
    }
  })

  it('accepts no transcript (null)', () => {
    const result = UpdateVideoRequestSchema.safeParse({
      tags: '["t1"]',
      transcript: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid transcript file', () => {
    const result = UpdateVideoRequestSchema.safeParse({
      tags: '["t1"]',
      transcript: makeFile('subtitles.srt'),
    })
    expect(result.success).toBe(true)
  })

  it('fails for invalid transcript extension', () => {
    const result = UpdateVideoRequestSchema.safeParse({
      tags: '["t1"]',
      transcript: makeFile('subtitles.pdf'),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Invalid file extension. Allowed: srt, vtt, txt'
      )
    }
  })

  it('accepts transcript file with size 0 even with invalid extension (skipped)', () => {
    const zeroFile = makeEmptyFile('file.pdf')
    const result = UpdateVideoRequestSchema.safeParse({
      tags: '["t1"]',
      transcript: zeroFile,
    })
    expect(result.success).toBe(true)
  })

  it('accepts all allowed transcript extensions', () => {
    for (const ext of ALLOWED_TRANSCRIPT_FORMATS) {
      const result = UpdateVideoRequestSchema.safeParse({
        tags: '["t1"]',
        transcript: makeFile(`subtitles.${ext}`),
      })
      expect(result.success).toBe(true)
    }
  })
})
