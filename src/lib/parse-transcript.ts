export interface TranscriptCue {
  index: number
  startTime: string
  endTime: string
  text: string
}

export function parseTranscript(content: string, format: string | null): TranscriptCue[] {
  const fmt = (format ?? '').toLowerCase()

  if (fmt === 'vtt') {
    // Strip WEBVTT header and treat as SRT-like
    const stripped = content.replace(/^WEBVTT[^\n]*\n/, '').trim()
    return parseSrt(stripped)
  }

  if (fmt === 'srt') {
    return parseSrt(content)
  }

  // Unknown format: split by lines into cues with empty timestamps
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => ({ index: i + 1, startTime: '', endTime: '', text: line }))
}

function parseSrt(content: string): TranscriptCue[] {
  const blocks = content.trim().split(/\n\s*\n/)
  const cues: TranscriptCue[] = []

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 2) continue

    const indexLine = lines[0].trim()
    const timeLine = lines[1].trim()
    const text = lines.slice(2).join(' ').trim()

    const timeMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/
    )
    if (!timeMatch) continue

    cues.push({
      index: parseInt(indexLine, 10) || cues.length + 1,
      startTime: timeMatch[1],
      endTime: timeMatch[2],
      text,
    })
  }

  return cues
}
