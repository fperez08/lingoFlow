import { z } from 'zod'

export const ALLOWED_TRANSCRIPT_FORMATS = ['srt', 'vtt', 'txt'] as const
export type AllowedTranscriptFormat = typeof ALLOWED_TRANSCRIPT_FORMATS[number]

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

/** Accepts actual File instances and duck-typed file-like objects (e.g. test mocks). */
function isFileLike(v: unknown): v is File {
  return (
    v instanceof File ||
    (typeof v === 'object' &&
      v !== null &&
      typeof (v as Record<string, unknown>).name === 'string')
  )
}

const transcriptFileSchema = z
  .custom<File>(isFileLike, 'Missing required fields: youtube_url and transcript')
  .refine(
    (f) => ALLOWED_TRANSCRIPT_FORMATS.includes(getFileExtension(f.name) as AllowedTranscriptFormat),
    `Invalid file extension. Allowed: ${ALLOWED_TRANSCRIPT_FORMATS.join(', ')}`
  )

export const ImportVideoRequestSchema = z.object({
  youtube_url: z.preprocess(
    (v) => (v === null || v === undefined ? '' : v),
    z.string().trim().min(1, 'Missing required fields: youtube_url and transcript')
  ),
  transcript: transcriptFileSchema,
  tags: z
    .custom<string | null | undefined>(
      (v) => v === null || v === undefined || typeof v === 'string',
      'Invalid tags field'
    )
    .transform((v) => (typeof v === 'string' ? v : '')),
})

export const ImportLocalVideoRequestSchema = z.object({
  video: z.custom<File>(isFileLike, 'Video file is required'),
  title: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim() : ''),
    z.string().min(1, 'Title is required')
  ),
  author: z
    .custom<string | null | undefined>(
      (v) => v === null || v === undefined || typeof v === 'string'
    )
    .transform((v) => (typeof v === 'string' ? v.trim() : ''))
    .optional(),
  transcript: transcriptFileSchema,
  tags: z
    .custom<string | null | undefined>(
      (v) => v === null || v === undefined || typeof v === 'string',
      'Invalid tags field'
    )
    .transform((v) => (typeof v === 'string' ? v : '')),
})

export const UpdateVideoRequestSchema = z.object({
  tags: z
    .string()
    .refine(
      (v) => {
        try {
          return Array.isArray(JSON.parse(v))
        } catch {
          return false
        }
      },
      'Tags must be a JSON array'
    )
    .transform((v) => JSON.parse(v) as string[]),
  transcript: z
    .custom<File | null | undefined>(
      (v) => v === null || v === undefined || isFileLike(v)
    )
    .optional()
    .nullable()
    .refine(
      (f) => {
        if (!f || (f as File).size === 0) return true
        return ALLOWED_TRANSCRIPT_FORMATS.includes(
          getFileExtension((f as File).name) as AllowedTranscriptFormat
        )
      },
      `Invalid file extension. Allowed: ${ALLOWED_TRANSCRIPT_FORMATS.join(', ')}`
    ),
})
