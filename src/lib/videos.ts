import { z } from 'zod'

export const VideoSchema = z.object({
  id: z.string(),
  youtube_url: z.string(),
  youtube_id: z.string(),
  title: z.string(),
  author_name: z.string(),
  thumbnail_url: z.string(),
  transcript_path: z.string(),
  transcript_format: z.string(),
  tags: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
})

export const InsertVideoParamsSchema = z.object({
  id: z.string(),
  youtube_url: z.string(),
  youtube_id: z.string(),
  title: z.string(),
  author_name: z.string(),
  thumbnail_url: z.string(),
  transcript_path: z.string(),
  transcript_format: z.string(),
  tags: z.array(z.string()),
})

export const UpdateVideoParamsSchema = z.object({
  tags: z.array(z.string()).optional(),
  transcript_path: z.string().optional(),
  transcript_format: z.string().optional(),
})

export type Video = z.infer<typeof VideoSchema>
export type InsertVideoParams = z.infer<typeof InsertVideoParamsSchema>
export type UpdateVideoParams = z.infer<typeof UpdateVideoParamsSchema>
