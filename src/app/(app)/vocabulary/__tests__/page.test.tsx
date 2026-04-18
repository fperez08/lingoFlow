import { render, screen, fireEvent } from '@testing-library/react'
import VocabularyPage from '../page'
import { VocabEntry } from '@/lib/vocab-store'

const mockMutate = jest.fn()

jest.mock('@/hooks/useVocabulary', () => ({
  useVocabulary: jest.fn(),
  useUpdateWordStatus: jest.fn(() => ({ mutate: mockMutate, isPending: false })),
}))

import { useVocabulary } from '@/hooks/useVocabulary'

const MOCK_ENTRIES: VocabEntry[] = [
  { word: 'ethereal', status: 'new', level: 'B2', definition: 'Extremely delicate' },
  { word: 'juxtaposition', status: 'new', level: 'C1', definition: 'Two contrasting things' },
  { word: 'eloquent', status: 'new', level: 'B1', definition: 'Fluent or persuasive' },
  { word: 'serendipity', status: 'learning', level: 'B2', definition: 'Happy chance' },
  { word: 'ephemeral', status: 'learning', level: 'C1', definition: 'Lasting briefly' },
  { word: 'resilient', status: 'learning', level: 'B1', definition: 'Recovering quickly' },
  { word: 'ambiguous', status: 'mastered', level: 'B1', definition: 'Open to interpretation' },
  { word: 'pragmatic', status: 'mastered', level: 'B2', definition: 'Dealing sensibly' },
  { word: 'nuance', status: 'mastered', level: 'B2', definition: 'A subtle difference' },
]

function makeMap(entries: VocabEntry[]) {
  return new Map(entries.map((e) => [e.word.toLowerCase(), e]))
}

beforeEach(() => {
  jest.mocked(useVocabulary).mockReturnValue({
    data: makeMap(MOCK_ENTRIES),
    isLoading: false,
  } as ReturnType<typeof useVocabulary>)
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('VocabularyPage', () => {
  it('renders the page heading', () => {
    render(<VocabularyPage />)
    expect(screen.getByTestId('vocab-page-heading')).toBeInTheDocument()
    expect(screen.getByTestId('vocab-page-heading')).toHaveTextContent('Vocabulary Manager')
  })

  it('shows New tab active by default and renders new-status words', () => {
    render(<VocabularyPage />)
    const newTab = screen.getByTestId('tab-new')
    expect(newTab).toHaveClass('text-primary')
    const cards = screen.getAllByTestId('vocab-card')
    expect(cards).toHaveLength(3)
  })

  it('switches to Learning tab and shows only learning words', () => {
    render(<VocabularyPage />)
    fireEvent.click(screen.getByTestId('tab-learning'))
    const cards = screen.getAllByTestId('vocab-card')
    expect(cards).toHaveLength(3)
    expect(screen.getByText('serendipity')).toBeInTheDocument()
    expect(screen.getByText('ephemeral')).toBeInTheDocument()
    expect(screen.getByText('resilient')).toBeInTheDocument()
  })

  it('switches to Mastered tab and shows only mastered words', () => {
    render(<VocabularyPage />)
    fireEvent.click(screen.getByTestId('tab-mastered'))
    const cards = screen.getAllByTestId('vocab-card')
    expect(cards).toHaveLength(3)
    expect(screen.getByText('ambiguous')).toBeInTheDocument()
    expect(screen.getByText('pragmatic')).toBeInTheDocument()
    expect(screen.getByText('nuance')).toBeInTheDocument()
  })

  it('filters cards by search query', () => {
    render(<VocabularyPage />)
    const input = screen.getByTestId('vocab-search-input')
    fireEvent.change(input, { target: { value: 'ethereal' } })
    const cards = screen.getAllByTestId('vocab-card')
    expect(cards).toHaveLength(1)
    expect(screen.getByText('ethereal')).toBeInTheDocument()
  })

  it('mark as mastered calls updateWordStatus mutation', () => {
    render(<VocabularyPage />)
    const masterButtons = screen.getAllByTestId('mark-mastered-button')
    fireEvent.click(masterButtons[0])
    expect(mockMutate).toHaveBeenCalledWith({ word: expect.any(String), status: 'mastered' })
  })

  it('shows empty state when no words match filters', () => {
    render(<VocabularyPage />)
    const input = screen.getByTestId('vocab-search-input')
    fireEvent.change(input, { target: { value: 'xyznonexistent' } })
    expect(screen.getByTestId('empty-vocab-state')).toBeInTheDocument()
    expect(screen.queryAllByTestId('vocab-card')).toHaveLength(0)
  })

  it('shows loading state while fetching', () => {
    jest.mocked(useVocabulary).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useVocabulary>)
    render(<VocabularyPage />)
    expect(screen.getByText('Loading vocabulary…')).toBeInTheDocument()
  })
})
