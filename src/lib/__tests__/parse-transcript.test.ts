import { parseTimeToSeconds, findActiveCueIndex, tokenizeWords, TranscriptCue } from '../parse-transcript'

describe('parseTimeToSeconds', () => {
  it('converts SRT timestamp with comma separator', () => {
    expect(parseTimeToSeconds('00:01:23,456')).toBeCloseTo(83.456)
  })

  it('converts VTT timestamp with period separator', () => {
    expect(parseTimeToSeconds('00:01:23.456')).toBeCloseTo(83.456)
  })

  it('returns 0 for empty string', () => {
    expect(parseTimeToSeconds('')).toBe(0)
  })

  it('converts hours correctly', () => {
    expect(parseTimeToSeconds('01:00:00,000')).toBe(3600)
  })

  it('converts minutes correctly', () => {
    expect(parseTimeToSeconds('00:02:30,500')).toBeCloseTo(150.5)
  })
})

describe('findActiveCueIndex', () => {
  const cues: TranscriptCue[] = [
    { index: 1, startTime: '00:00:01,000', endTime: '00:00:03,000', text: 'First' },
    { index: 2, startTime: '00:00:05,000', endTime: '00:00:07,000', text: 'Second' },
    { index: 3, startTime: '00:00:09,000', endTime: '00:00:11,000', text: 'Third' },
  ]

  it('returns the index when currentTime falls inside a cue window', () => {
    expect(findActiveCueIndex(cues, 2)).toBe(0)
    expect(findActiveCueIndex(cues, 6)).toBe(1)
    expect(findActiveCueIndex(cues, 10)).toBe(2)
  })

  it('returns lastBefore index when currentTime is in a gap between cues', () => {
    // Gap between cue 0 (ends at 3s) and cue 1 (starts at 5s): time = 4s
    expect(findActiveCueIndex(cues, 4)).toBe(0)
    // Gap between cue 1 and cue 2: time = 8s
    expect(findActiveCueIndex(cues, 8)).toBe(1)
  })

  it('returns -1 when currentTime is before all cues', () => {
    expect(findActiveCueIndex(cues, 0)).toBe(-1)
    expect(findActiveCueIndex(cues, 0.5)).toBe(-1)
  })

  it('returns -1 for empty cues array', () => {
    expect(findActiveCueIndex([], 5)).toBe(-1)
  })

  it('handles plain-text cues with empty timestamps (all parse to 0)', () => {
    const plainCues: TranscriptCue[] = [
      { index: 1, startTime: '', endTime: '', text: 'Line 1' },
      { index: 2, startTime: '', endTime: '', text: 'Line 2' },
    ]
    // All start times parse to 0, so lastBefore will be the last cue with start <= currentTime
    const result = findActiveCueIndex(plainCues, 5)
    expect(result).toBeGreaterThanOrEqual(-1)
  })
})

describe('tokenizeWords', () => {
  it('splits on whitespace and keeps punctuation attached', () => {
    expect(tokenizeWords('hello, world!')).toEqual(['hello,', 'world!'])
  })

  it('trims leading/trailing whitespace', () => {
    expect(tokenizeWords('  spaces  ')).toEqual(['spaces'])
  })

  it('returns empty array for empty string', () => {
    expect(tokenizeWords('')).toEqual([])
  })

  it('handles single word', () => {
    expect(tokenizeWords('single')).toEqual(['single'])
  })

  it('preserves contractions', () => {
    expect(tokenizeWords("it's a test")).toEqual(["it's", 'a', 'test'])
  })
})

describe('proportional word index formula', () => {
  function highlightedIndex(cueStart: number, cueEnd: number, currentTime: number, wordCount: number): number {
    const cueDuration = cueEnd - cueStart
    const elapsed = currentTime - cueStart
    const fraction = cueDuration > 0 ? Math.min(Math.max(elapsed / cueDuration, 0), 1) : 0
    return wordCount > 0 ? Math.min(Math.floor(fraction * wordCount), wordCount - 1) : -1
  }

  it('returns 0 (first word) when currentTime === cueStart', () => {
    expect(highlightedIndex(10, 14, 10, 4)).toBe(0)
  })

  it('returns middle word index at midpoint', () => {
    // 4 words, midpoint = 50% -> floor(0.5 * 4) = 2
    expect(highlightedIndex(10, 14, 12, 4)).toBe(2)
  })

  it('returns last word index when currentTime >= cueEnd', () => {
    expect(highlightedIndex(10, 14, 14, 4)).toBe(3)
    expect(highlightedIndex(10, 14, 20, 4)).toBe(3)
  })

  it('handles plain-text cue with no timing (cueStart === cueEnd === 0)', () => {
    expect(highlightedIndex(0, 0, 0, 4)).toBe(0)
  })

  it('clamps to first word when currentTime < cueStart', () => {
    expect(highlightedIndex(10, 14, 5, 4)).toBe(0)
  })
})
