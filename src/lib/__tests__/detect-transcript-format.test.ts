import { detectPastedTranscriptFormat } from '../detect-transcript-format'

describe('detectPastedTranscriptFormat', () => {
  it('returns vtt for text starting with WEBVTT', () => {
    expect(detectPastedTranscriptFormat('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello')).toBe('vtt')
  })

  it('returns vtt for WEBVTT header with extra info', () => {
    expect(detectPastedTranscriptFormat('WEBVTT - Made with love\n\n00:00:01.000 --> 00:00:02.000\nHello')).toBe('vtt')
  })

  it('returns vtt when there is leading whitespace before WEBVTT', () => {
    expect(detectPastedTranscriptFormat('  \nWEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello')).toBe('vtt')
  })

  it('returns srt for text containing SRT timestamp lines', () => {
    const srt = '1\n00:00:01,000 --> 00:00:02,000\nHello world\n\n2\n00:00:03,000 --> 00:00:04,000\nFoo bar'
    expect(detectPastedTranscriptFormat(srt)).toBe('srt')
  })

  it('returns txt for plain text', () => {
    expect(detectPastedTranscriptFormat('This is a plain text transcript with no markers')).toBe('txt')
  })

  it('returns txt for empty string', () => {
    expect(detectPastedTranscriptFormat('')).toBe('txt')
  })
})
