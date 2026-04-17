// @jest-environment node

jest.mock('@ffmpeg-installer/ffmpeg', () => ({ path: '/fake/ffmpeg' }))

jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}))

// Capture mock handlers for the ffmpeg chain
type EventCb = (...args: unknown[]) => void
let onHandlers: Record<string, EventCb> = {}
let mockScreenshots: jest.Mock
let mockOn: jest.Mock
let mockFfmpegCall: jest.Mock

jest.mock('fluent-ffmpeg', () => {
  // Return a function that builds a chainable instance
  const factory = jest.fn()
  factory.setFfmpegPath = jest.fn()
  return factory
})

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegMock = require('fluent-ffmpeg') as jest.Mock & { setFfmpegPath: jest.Mock }

import { generateThumbnail, deleteThumbnail } from '../thumbnails'

function buildChain(triggerEvent?: string, triggerArg?: unknown) {
  onHandlers = {}
  mockScreenshots = jest.fn().mockReturnThis()
  mockOn = jest.fn().mockImplementation((event: string, cb: EventCb) => {
    onHandlers[event] = cb
    return chain
  })
  const chain = { on: mockOn, screenshots: mockScreenshots }
  mockFfmpegCall = ffmpegMock as unknown as jest.Mock
  mockFfmpegCall.mockReturnValue(chain)

  if (triggerEvent) {
    mockScreenshots.mockImplementation(() => {
      setTimeout(() => onHandlers[triggerEvent]?.(triggerArg), 0)
      return chain
    })
  }

  return chain
}

describe('generateThumbnail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns the output path on success', async () => {
    buildChain('end')
    const result = await generateThumbnail('/videos/test.mp4', '/thumbs/test.jpg')
    expect(result).toBe('/thumbs/test.jpg')
  })

  it('calls ffmpeg with correct arguments', async () => {
    buildChain('end')
    await generateThumbnail('/videos/test.mp4', '/thumbs/test.jpg')

    expect(ffmpegMock).toHaveBeenCalledWith('/videos/test.mp4')
    expect(mockScreenshots).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamps: [1],
        filename: 'test.jpg',
        folder: '/thumbs',
        size: '640x?',
      })
    )
  })

  it('returns null on ffmpeg error', async () => {
    buildChain('error', new Error('ffmpeg failed'))
    const result = await generateThumbnail('/videos/test.mp4', '/thumbs/test.jpg')
    expect(result).toBeNull()
  })

  it('returns null when an unexpected exception is thrown', async () => {
    ffmpegMock.mockImplementation(() => { throw new Error('unexpected') })
    const result = await generateThumbnail('/videos/test.mp4', '/thumbs/test.jpg')
    expect(result).toBeNull()
  })
})

describe('deleteThumbnail', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fsMock = require('fs') as { unlinkSync: jest.Mock }

  it('does not throw when file is missing', async () => {
    fsMock.unlinkSync.mockImplementation(() => {
      const err = new Error('ENOENT') as NodeJS.ErrnoException
      err.code = 'ENOENT'
      throw err
    })
    await expect(deleteThumbnail('/thumbs/missing.jpg')).resolves.toBeUndefined()
  })

  it('resolves without error when file is deleted', async () => {
    fsMock.unlinkSync.mockImplementation(() => { /* success */ })
    await expect(deleteThumbnail('/thumbs/test.jpg')).resolves.toBeUndefined()
  })
})
