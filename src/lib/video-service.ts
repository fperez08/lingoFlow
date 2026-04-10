import { VideoStore } from './video-store'
import { Video, InsertVideoParams, UpdateVideoParams } from './videos'

export interface TranscriptStore {
  write(videoId: string, ext: string, buffer: Buffer): string
  delete(filePath: string): void
}

export interface ImportVideoParams {
  id: string
  youtube_url: string
  youtube_id: string
  title: string
  author_name: string
  thumbnail_url: string
  transcript_ext: string
  transcript_buffer: Buffer
  tags: string[]
}

export interface UpdateVideoServiceParams {
  tags?: string[]
  transcript_ext?: string
  transcript_buffer?: Buffer
}

export class VideoService {
  constructor(
    private store: VideoStore,
    private transcripts: TranscriptStore
  ) {}

  async importVideo(params: ImportVideoParams): Promise<Video> {
    const transcriptPath = this.transcripts.write(params.id, params.transcript_ext, params.transcript_buffer)

    const insertParams: InsertVideoParams = {
      id: params.id,
      youtube_url: params.youtube_url,
      youtube_id: params.youtube_id,
      title: params.title,
      author_name: params.author_name,
      thumbnail_url: params.thumbnail_url,
      transcript_path: transcriptPath,
      transcript_format: params.transcript_ext,
      tags: params.tags,
    }

    try {
      return this.store.insert(insertParams)
    } catch (err) {
      this.transcripts.delete(transcriptPath)
      throw err
    }
  }

  async updateVideo(id: string, params: UpdateVideoServiceParams): Promise<Video | undefined> {
    const existing = this.store.getById(id)
    if (!existing) return undefined

    let newTranscriptPath: string | undefined

    if (params.transcript_ext !== undefined && params.transcript_buffer !== undefined) {
      newTranscriptPath = this.transcripts.write(id, params.transcript_ext, params.transcript_buffer)
    }

    const updateParams: UpdateVideoParams = { tags: params.tags }
    if (newTranscriptPath !== undefined) {
      updateParams.transcript_path = newTranscriptPath
      updateParams.transcript_format = params.transcript_ext
    }

    let updated: Video | undefined
    try {
      updated = this.store.update(id, updateParams)
    } catch (err) {
      if (newTranscriptPath !== undefined) {
        this.transcripts.delete(newTranscriptPath)
      }
      throw err
    }

    if (updated && newTranscriptPath !== undefined && existing.transcript_path) {
      this.transcripts.delete(existing.transcript_path)
    }

    return updated
  }

  async deleteVideo(id: string): Promise<boolean> {
    const existing = this.store.getById(id)
    if (!existing) return false

    const deleted = this.store.delete(id)
    if (!deleted) return false

    try {
      this.transcripts.delete(existing.transcript_path)
    } catch (err) {
      console.error(`Failed to delete transcript file for video ${id}:`, err)
    }

    return true
  }
}
