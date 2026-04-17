import { VideoStore } from './video-store'
import { Video, InsertVideoParams, UpdateVideoParams } from './videos'

export interface TranscriptStore {
  write(videoId: string, ext: string, buffer: Buffer): string
  delete(filePath: string): void
}

export interface VideoFileStore {
  write(videoId: string, ext: string, buffer: Buffer): string
  delete(filePath: string): void
}

export interface ImportVideoParams {
  id: string
  title: string
  author_name: string
  thumbnail_url: string
  transcript_ext: string
  transcript_buffer: Buffer
  tags: string[]
  // No YouTube fields
}

export interface ImportLocalVideoParams {
  id: string
  title: string
  author_name: string
  video_buffer: Buffer
  video_ext: string
  video_filename: string
  transcript_buffer: Buffer
  transcript_ext: string
  tags: string[]
  source_type: 'local'
}

export interface UpdateVideoServiceParams {
  tags?: string[]
  transcript_ext?: string
  transcript_buffer?: Buffer
}

export class VideoService {
  constructor(
    private store: VideoStore,
    private transcripts: TranscriptStore,
    private videoFiles: VideoFileStore,
  ) {}

  async importVideo(params: ImportVideoParams): Promise<Video> {
    const transcriptPath = this.transcripts.write(params.id, params.transcript_ext, params.transcript_buffer)

    const insertParams: InsertVideoParams = {
      id: params.id,

      title: params.title,
      author_name: params.author_name,
      thumbnail_url: params.thumbnail_url,
      transcript_path: transcriptPath,
      transcript_format: params.transcript_ext,
      tags: params.tags,
      source_type: 'local',
    }

    try {
      return this.store.insert(insertParams)
    } catch (err) {
      this.transcripts.delete(transcriptPath)
      throw err
    }
  }

  async importLocalVideo(params: ImportLocalVideoParams): Promise<Video> {
    const videoPath = this.videoFiles.write(params.id, params.video_ext, params.video_buffer)

    let transcriptPath: string
    try {
      transcriptPath = this.transcripts.write(params.id, params.transcript_ext, params.transcript_buffer)
    } catch (err) {
      this.videoFiles.delete(videoPath)
      throw err
    }

    const insertParams: InsertVideoParams = {
      id: params.id,

      title: params.title,
      author_name: params.author_name,
      thumbnail_url: '',
      transcript_path: transcriptPath,
      transcript_format: params.transcript_ext,
      tags: params.tags,
      source_type: 'local',
      local_video_path: videoPath,
      local_video_filename: params.video_filename,
    }

    try {
      return this.store.insert(insertParams)
    } catch (err) {
      this.transcripts.delete(transcriptPath)
      this.videoFiles.delete(videoPath)
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

    if (existing.source_type === 'local' && existing.local_video_path) {
      try {
        this.videoFiles.delete(existing.local_video_path)
      } catch (err) {
        console.error(`Failed to delete video file for ${id}:`, err)
      }
    }

    if (existing.thumbnail_path) {
      try {
        this.videoFiles.delete(existing.thumbnail_path)
      } catch (err) {
        console.error(`Failed to delete thumbnail file for video ${id}:`, err)
      }
    }

    return true
  }
}
