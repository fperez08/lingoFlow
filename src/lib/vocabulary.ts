import { z } from 'zod'

/** Minimal interface satisfied by both VocabWord (mock) and VocabEntry (DB). */
export interface VocabInfo {
  status: 'new' | 'learning' | 'mastered'
  level?: string
  definition?: string
  source?: string
}

export const VocabWordSchema = z.object({
  id: z.string(),
  word: z.string(),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  definition: z.string(),
  contextQuote: z.string(),
  source: z.string(),
  status: z.enum(['new', 'learning', 'mastered']),
})
export type VocabWord = z.infer<typeof VocabWordSchema>

export const MOCK_VOCAB: VocabWord[] = [
  { id: '1', word: 'Ethereal', level: 'B2', definition: 'Extremely delicate and light in a way that seems too perfect for this world', contextQuote: 'The ethereal beauty of the mountain sunrise left us speechless', source: 'Cinema', status: 'new' },
  { id: '2', word: 'Juxtaposition', level: 'C1', definition: 'The fact of two things being seen or placed close together with contrasting effect', contextQuote: 'The juxtaposition of wealth and poverty was stark in the city', source: 'Literature', status: 'new' },
  { id: '3', word: 'Eloquent', level: 'B1', definition: 'Fluent or persuasive in speaking or writing', contextQuote: 'She gave an eloquent speech that moved the entire audience', source: 'Science', status: 'new' },
  { id: '4', word: 'Serendipity', level: 'B2', definition: 'The occurrence and development of events by chance in a happy or beneficial way', contextQuote: 'It was pure serendipity that we met at that coffee shop', source: 'Cinema', status: 'learning' },
  { id: '5', word: 'Ephemeral', level: 'C1', definition: 'Lasting for a very short time', contextQuote: 'The ephemeral nature of cherry blossoms makes them all the more beautiful', source: 'Nature', status: 'learning' },
  { id: '6', word: 'Resilient', level: 'B1', definition: 'Able to withstand or recover quickly from difficult conditions', contextQuote: 'The resilient community rebuilt after the disaster', source: 'Tech', status: 'learning' },
  { id: '7', word: 'Ambiguous', level: 'B1', definition: 'Open to more than one interpretation', contextQuote: 'The ambiguous ending left viewers debating for weeks', source: 'Cinema', status: 'mastered' },
  { id: '8', word: 'Pragmatic', level: 'B2', definition: 'Dealing with things sensibly and realistically', contextQuote: 'A pragmatic approach to solving the problem saved hours of work', source: 'Tech', status: 'mastered' },
  { id: '9', word: 'Nuance', level: 'B2', definition: 'A subtle difference in or shade of meaning, expression, or sound', contextQuote: 'The nuance in her tone suggested she was not entirely pleased', source: 'Literature', status: 'mastered' },
]

export const VOCAB_SOURCES = ['Cinema', 'Literature', 'Science', 'Nature', 'Tech'] as const
export const VOCAB_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
