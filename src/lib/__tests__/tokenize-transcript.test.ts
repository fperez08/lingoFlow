import { tokenizeCueText } from '@/lib/tokenize-transcript'

describe('tokenizeCueText', () => {
  it('tokenizes a simple sentence into word and punct tokens', () => {
    const tokens = tokenizeCueText('Hello world')
    expect(tokens).toEqual([
      { type: 'word', raw: 'Hello', normalized: 'hello' },
      { type: 'punct', raw: ' ' },
      { type: 'word', raw: 'world', normalized: 'world' },
    ])
  })

  it('treats punctuation as punct tokens', () => {
    const tokens = tokenizeCueText('Hello, world!')
    const types = tokens.map((t) => t.type)
    expect(types).toContain('word')
    expect(types).toContain('punct')
    const words = tokens.filter((t) => t.type === 'word').map((t) => t.raw)
    expect(words).toEqual(['Hello', 'world'])
  })

  it('treats numbers as punct tokens', () => {
    const tokens = tokenizeCueText('Chapter 3 begins')
    const words = tokens.filter((t) => t.type === 'word').map((t) => t.raw)
    expect(words).toEqual(['Chapter', 'begins'])
  })

  it('normalizes words to lowercase in normalized field', () => {
    const tokens = tokenizeCueText('HELLO World')
    const wordTokens = tokens.filter((t) => t.type === 'word')
    expect(wordTokens[0]).toMatchObject({ raw: 'HELLO', normalized: 'hello' })
    expect(wordTokens[1]).toMatchObject({ raw: 'World', normalized: 'world' })
  })

  it('returns empty array for empty string', () => {
    expect(tokenizeCueText('')).toEqual([])
  })

  it('handles hyphenated text as non-word tokens', () => {
    const tokens = tokenizeCueText('well-known')
    const words = tokens.filter((t) => t.type === 'word').map((t) => t.raw)
    expect(words).toEqual(['well', 'known'])
  })
})
