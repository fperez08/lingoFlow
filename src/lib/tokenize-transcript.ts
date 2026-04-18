export interface WordToken {
  type: 'word'
  raw: string
  normalized: string
}

export interface PunctToken {
  type: 'punct'
  raw: string
}

export type TranscriptToken = WordToken | PunctToken

const WORD_RE = /^[a-zA-Z]+$/

export function tokenizeCueText(text: string): TranscriptToken[] {
  const parts = text.split(/(\s+|[^a-zA-Z\s]+)/).filter((p) => p.length > 0)
  const tokens: TranscriptToken[] = []

  for (const part of parts) {
    if (WORD_RE.test(part)) {
      tokens.push({ type: 'word', raw: part, normalized: part.toLowerCase() })
    } else {
      tokens.push({ type: 'punct', raw: part })
    }
  }

  return tokens
}
