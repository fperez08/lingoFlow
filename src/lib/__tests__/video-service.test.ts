import { VideoService, TranscriptStore, ImportVideoParams, UpdateVideoServiceParams, PostImportTask, VideoFileStore, ImportLocalVideoParams } from '../video-service'
import { VideoStore } from '../video-store'
import { Video, UpdateVideoParams } from '../videos'

function makeVideo(overrides: Partial<Video> = {}): Video {
  return {
    id: 'vid1',
    title: 'Test Video',
    author_name: 'Author',
    thumbnail_url: 'https://img.youtube.com/vi/abc/0.jpg',
    transcript_path: '/data/transcripts/vid1.vtt',
    transcript_format: 'vtt',
    tags: [],
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    source_type: 'local',
    ...overrides,
  }
}

function makeVideoStore(overrides: Partial<VideoStore> = {}): jest.Mocked<VideoStore> {
  return {
    list: jest.fn().mockReturnValue([]),
    getById: jest.fn().mockReturnValue(undefined),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as jest.Mocked<VideoStore>
}

function makeTranscriptStore(overrides: Partial<TranscriptStore> = {}): jest.Mocked<TranscriptStore> {
  return {
    write: jest.fn().mockReturnValue('/data/transcripts/vid1.vtt'),
    delete: jest.fn(),
    ...overrides,
  } as jest.Mocked<TranscriptStore>
}

function makeVideoFileStore(overrides: Partial<VideoFileStore> = {}): jest.Mocked<VideoFileStore> {
  return {
    write: jest.fn().mockReturnValue('/data/videos/vid1.mp4'),
    delete: jest.fn(),
    ...overrides,
  } as jest.Mocked<VideoFileStore>
}

const importParams: ImportVideoParams = {
  id: 'vid1',
  title: 'Test Video',
  author_name: 'Author',
  thumbnail_url: 'https://img.youtube.com/vi/abc/0.jpg',
  transcript_ext: 'vtt',
  transcript_buffer: Buffer.from('WEBVTT'),
  tags: [],
}

const localImportParams: ImportLocalVideoParams = {
  id: 'vid1',
  title: 'Test Video',
  author_name: 'Author',
  video_buffer: Buffer.from('fake-video'),
  video_ext: 'mp4',
  video_filename: 'test.mp4',
  transcript_buffer: Buffer.from('WEBVTT'),
  transcript_ext: 'vtt',
  tags: [],
  source_type: 'local',
}

describe('VideoService.importVideo', () => {
  it('writes transcript and inserts DB row on success', async () => {
    const video = makeVideo()
    const store = makeVideoStore({ insert: jest.fn().mockReturnValue(video) })
    const transcripts = makeTranscriptStore()
    const videoFiles = makeVideoFileStore()
    const service = new VideoService(store, transcripts, videoFiles)

    const result = await service.importVideo(importParams)

    expect(transcripts.write).toHaveBeenCalledWith('vid1', 'vtt', importParams.transcript_buffer)
    expect(store.insert).toHaveBeenCalledWith(expect.objectContaining({ id: 'vid1', transcript_path: '/data/transcripts/vid1.vtt' }))
    expect(result).toEqual(video)
  })

  it('deletes transcript file if DB insert fails (compensating action)', async () => {
    const dbError = new Error('DB insert failed')
    const store = makeVideoStore({ insert: jest.fn().mockImplementation(() => { throw dbError }) })
    const transcripts = makeTranscriptStore()
    const videoFiles = makeVideoFileStore()
    const service = new VideoService(store, transcripts, videoFiles)

    await expect(service.importVideo(importParams)).rejects.toThrow('DB insert failed')
    expect(transcripts.delete).toHaveBeenCalledWith('/data/transcripts/vid1.vtt')
  })
})

describe('VideoService.importLocalVideo with PostImportTask', () => {
  it('calls registered task with saved video and merges update into store', async () => {
    const video = makeVideo({ local_video_path: '/data/videos/vid1.mp4' })
    const store = makeVideoStore({ insert: jest.fn().mockReturnValue(video) })
    const transcripts = makeTranscriptStore()
    const videoFiles = makeVideoFileStore()
    const service = new VideoService(store, transcripts, videoFiles)

    const fakeTask: PostImportTask = {
      run: jest.fn().mockResolvedValue({ thumbnail_path: '/data/thumbnails/vid1.jpg' }),
    }
    service.registerPostImportTask(fakeTask)

    const result = await service.importLocalVideo(localImportParams)

    expect(fakeTask.run).toHaveBeenCalledWith(video)
    expect(store.update).toHaveBeenCalledWith('vid1', { thumbnail_path: '/data/thumbnails/vid1.jpg' })
    expect(result).toEqual(video)
  })

  it('runs multiple tasks and merges all their updates in one store.update call', async () => {
    const video = makeVideo({ local_video_path: '/data/videos/vid1.mp4' })
    const store = makeVideoStore({ insert: jest.fn().mockReturnValue(video) })
    const transcripts = makeTranscriptStore()
    const videoFiles = makeVideoFileStore()
    const service = new VideoService(store, transcripts, videoFiles)

    const task1: PostImportTask = {
      run: jest.fn().mockResolvedValue({ thumbnail_path: '/data/thumbnails/vid1.jpg' } as Partial<UpdateVideoParams>),
    }
    const task2: PostImportTask = {
      run: jest.fn().mockResolvedValue({ tags: ['auto'] } as Partial<UpdateVideoParams>),
    }
    service.registerPostImportTask(task1).registerPostImportTask(task2)

    await service.importLocalVideo(localImportParams)

    expect(store.update).toHaveBeenCalledTimes(1)
    expect(store.update).toHaveBeenCalledWith('vid1', {
      thumbnail_path: '/data/thumbnails/vid1.jpg',
      tags: ['auto'],
    })
  })

  it('does not call store.update if all tasks return empty objects', async () => {
    const video = makeVideo({ local_video_path: '/data/videos/vid1.mp4' })
    const store = makeVideoStore({ insert: jest.fn().mockReturnValue(video) })
    const transcripts = makeTranscriptStore()
    const videoFiles = makeVideoFileStore()
    const service = new VideoService(store, transcripts, videoFiles)

    const fakeTask: PostImportTask = {
      run: jest.fn().mockResolvedValue({}),
    }
    service.registerPostImportTask(fakeTask)

    await service.importLocalVideo(localImportParams)

    expect(store.update).not.toHaveBeenCalled()
  })

  it('task error does not fail the import — logs error, returns saved video', async () => {
    const video = makeVideo({ local_video_path: '/data/videos/vid1.mp4' })
    const store = makeVideoStore({ insert: jest.fn().mockReturnValue(video) })
    const transcripts = makeTranscriptStore()
    const videoFiles = makeVideoFileStore()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const service = new VideoService(store, transcripts, videoFiles)

    const failingTask: PostImportTask = {
      run: jest.fn().mockRejectedValue(new Error('ffmpeg not found')),
    }
    service.registerPostImportTask(failingTask)

    const result = await service.importLocalVideo(localImportParams)

    expect(result).toEqual(video)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('PostImportTask failed'), expect.any(Error))
    expect(store.update).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('drainPostImportTasks is callable independently', async () => {
    const video = makeVideo({ local_video_path: '/data/videos/vid1.mp4' })
    const store = makeVideoStore()
    const transcripts = makeTranscriptStore()
    const videoFiles = makeVideoFileStore()
    const service = new VideoService(store, transcripts, videoFiles)

    const fakeTask: PostImportTask = {
      run: jest.fn().mockResolvedValue({ thumbnail_path: '/data/thumbnails/vid1.jpg' }),
    }
    service.registerPostImportTask(fakeTask)

    await service.drainPostImportTasks(video)

    expect(fakeTask.run).toHaveBeenCalledWith(video)
    expect(store.update).toHaveBeenCalledWith('vid1', { thumbnail_path: '/data/thumbnails/vid1.jpg' })
  })

  it('registerPostImportTask is fluent (returns this)', () => {
    const store = makeVideoStore()
    const transcripts = makeTranscriptStore()
    const videoFiles = makeVideoFileStore()
    const service = new VideoService(store, transcripts, videoFiles)

    const task: PostImportTask = { run: jest.fn().mockResolvedValue({}) }
    const returned = service.registerPostImportTask(task)
    expect(returned).toBe(service)
  })
})

describe('VideoService.updateVideo', () => {
  it('returns undefined if video does not exist', async () => {
    const store = makeVideoStore({ getById: jest.fn().mockReturnValue(undefined) })
    const transcripts = makeTranscriptStore()
    const videoFiles = makeVideoFileStore()
    const service = new VideoService(store, transcripts, videoFiles)

    const result = await service.updateVideo('vid1', { tags: ['new'] })
    expect(result).toBeUndefined()
  })

  it('writes new transcript and deletes old one only after DB success', async () => {
    const existing = makeVideo({ transcript_path: '/data/transcripts/vid1.vtt' })
    const updated = makeVideo({ transcript_path: '/data/transcripts/vid1-new.vtt', transcript_format: 'srt' })
    const store = makeVideoStore({
      getById: jest.fn().mockReturnValue(existing),
      update: jest.fn().mockReturnValue(updated),
    })
    const transcripts = makeTranscriptStore({ write: jest.fn().mockReturnValue('/data/transcripts/vid1-new.vtt') })
    const videoFiles = makeVideoFileStore()
    const service = new VideoService(store, transcripts, videoFiles)

    const params: UpdateVideoServiceParams = { transcript_ext: 'srt', transcript_buffer: Buffer.from('transcript') }
    const result = await service.updateVideo('vid1', params)

    expect(transcripts.write).toHaveBeenCalledWith('vid1', 'srt', params.transcript_buffer)
    expect(store.update).toHaveBeenCalledWith('vid1', expect.objectContaining({ transcript_path: '/data/transcripts/vid1-new.vtt' }))
    expect(transcripts.delete).toHaveBeenCalledWith('/data/transcripts/vid1.vtt')
    expect(result).toEqual(updated)
  })

  it('does NOT delete old transcript if DB update fails (compensating action deletes new file)', async () => {
    const existing = makeVideo({ transcript_path: '/data/transcripts/vid1.vtt' })
    const dbError = new Error('DB update failed')
    const store = makeVideoStore({
      getById: jest.fn().mockReturnValue(existing),
      update: jest.fn().mockImplementation(() => { throw dbError }),
    })
    const transcripts = makeTranscriptStore({ write: jest.fn().mockReturnValue('/data/transcripts/vid1-new.vtt') })
    const videoFiles = makeVideoFileStore()
    const service = new VideoService(store, transcripts, videoFiles)

    const params: UpdateVideoServiceParams = { transcript_ext: 'srt', transcript_buffer: Buffer.from('transcript') }
    await expect(service.updateVideo('vid1', params)).rejects.toThrow('DB update failed')

    // New file should be cleaned up
    expect(transcripts.delete).toHaveBeenCalledWith('/data/transcripts/vid1-new.vtt')
    // Old file must NOT be deleted
    expect(transcripts.delete).not.toHaveBeenCalledWith('/data/transcripts/vid1.vtt')
  })
})

describe('VideoService.deleteVideo', () => {
  it('returns false if video does not exist', async () => {
    const store = makeVideoStore({ getById: jest.fn().mockReturnValue(undefined) })
    const transcripts = makeTranscriptStore()
    const videoFiles = makeVideoFileStore()
    const service = new VideoService(store, transcripts, videoFiles)

    const result = await service.deleteVideo('vid1')
    expect(result).toBe(false)
  })

  it('deletes DB row then transcript file on success', async () => {
    const video = makeVideo()
    const store = makeVideoStore({
      getById: jest.fn().mockReturnValue(video),
      delete: jest.fn().mockReturnValue(true),
    })
    const transcripts = makeTranscriptStore()
    const videoFiles = makeVideoFileStore()
    const service = new VideoService(store, transcripts, videoFiles)

    const result = await service.deleteVideo('vid1')

    expect(store.delete).toHaveBeenCalledWith('vid1')
    expect(transcripts.delete).toHaveBeenCalledWith(video.transcript_path)
    expect(result).toBe(true)
  })

  it('continues and returns true if transcript file deletion fails (logs error)', async () => {
    const video = makeVideo()
    const store = makeVideoStore({
      getById: jest.fn().mockReturnValue(video),
      delete: jest.fn().mockReturnValue(true),
    })
    const transcripts = makeTranscriptStore({
      delete: jest.fn().mockImplementation(() => { throw new Error('File not found') }),
    })
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const videoFiles = makeVideoFileStore()
    const service = new VideoService(store, transcripts, videoFiles)

    const result = await service.deleteVideo('vid1')

    expect(result).toBe(true)
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
