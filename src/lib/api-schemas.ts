import { z } from 'zod'

export const ALLOWED_TRANSCRIPT_FORMATS = ['srt', 'vtt', 'txt'] as const
export type AllowedTranscriptFormat = typeof ALLOWED_TRANSCRIPT_FORMATS[number]

export const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const
export type AllowedVideoMimeType = typeof ALLOWED_VIDEO_MIME_TYPES[number]

export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'] as const

export const MAX_VIDEO_SIZE_BYTES = 524_288_000 // 500 MB

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
  .custom<File>(isFileLike, 'Transcript file is required')
  .refine(
    (f) => ALLOWED_TRANSCRIPT_FORMATS.includes(getFileExtension(f.name) as AllowedTranscriptFormat),
    `Invalid file extension. Allowed: ${ALLOWED_TRANSCRIPT_FORMATS.join(', ')}`
  )

export const ImportVideoRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().optional(),
  transcript: transcriptFileSchema,
  tags: z
    .custom<string | null | undefined>(
      (v) => v === null || v === undefined || typeof v === 'string',
      'Invalid tags field'
    )
    .transform((v) => (typeof v === 'string' ? v : '')),
})

const videoFileSchema = z
  .custom<File>(isFileLike, 'Video file is required')
  .refine(
    (f) => ALLOWED_VIDEO_MIME_TYPES.includes((f as File).type as AllowedVideoMimeType),
    'Unsupported format. Allowed: MP4, WebM, MOV'
  )
  .refine(
    (f) => (f as File).size <= MAX_VIDEO_SIZE_BYTES,
    'File exceeds 500 MB limit'
  )

export const ImportLocalVideoRequestSchema = z.object({
  video: videoFileSchema,
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

export const UpdateVocabRequestSchema = z.object({
  status: z.enum(['new', 'learning', 'mastered']).optional(),
  definition: z.string().optional(),
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
