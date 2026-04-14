const SRT_TIMESTAMP_PATTERN = /\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/

export function detectPastedTranscriptFormat(text: string): 'vtt' | 'srt' | 'txt' {
  if (text.trimStart().startsWith('WEBVTT')) return 'vtt'
  if (SRT_TIMESTAMP_PATTERN.test(text)) return 'srt'
  return 'txt'
}
