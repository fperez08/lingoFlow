import { render, screen, fireEvent } from '@testing-library/react'
import VocabularyPage from '../page'

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
    // 3 new words in mock data
    expect(cards).toHaveLength(3)
  })

  it('switches to Learning tab and shows only learning words', () => {
    render(<VocabularyPage />)
    fireEvent.click(screen.getByTestId('tab-learning'))
    const cards = screen.getAllByTestId('vocab-card')
    expect(cards).toHaveLength(3)
    expect(screen.getByText('Serendipity')).toBeInTheDocument()
    expect(screen.getByText('Ephemeral')).toBeInTheDocument()
    expect(screen.getByText('Resilient')).toBeInTheDocument()
  })

  it('switches to Mastered tab and shows only mastered words', () => {
    render(<VocabularyPage />)
    fireEvent.click(screen.getByTestId('tab-mastered'))
    const cards = screen.getAllByTestId('vocab-card')
    expect(cards).toHaveLength(3)
    expect(screen.getByText('Ambiguous')).toBeInTheDocument()
    expect(screen.getByText('Pragmatic')).toBeInTheDocument()
    expect(screen.getByText('Nuance')).toBeInTheDocument()
  })

  it('filters cards by search query', () => {
    render(<VocabularyPage />)
    const input = screen.getByTestId('vocab-search-input')
    fireEvent.change(input, { target: { value: 'Ethereal' } })
    const cards = screen.getAllByTestId('vocab-card')
    expect(cards).toHaveLength(1)
    expect(screen.getByText('Ethereal')).toBeInTheDocument()
  })

  it('mark as mastered removes word from New list', () => {
    render(<VocabularyPage />)
    // On the New tab, all 3 words visible
    expect(screen.getAllByTestId('vocab-card')).toHaveLength(3)
    const masterButtons = screen.getAllByTestId('mark-mastered-button')
    fireEvent.click(masterButtons[0])
    // One word moved to mastered — now 2 new words shown
    expect(screen.getAllByTestId('vocab-card')).toHaveLength(2)
  })

  it('remove button removes the card from the list', () => {
    render(<VocabularyPage />)
    expect(screen.getAllByTestId('vocab-card')).toHaveLength(3)
    const removeButtons = screen.getAllByTestId('remove-button')
    fireEvent.click(removeButtons[0])
    expect(screen.getAllByTestId('vocab-card')).toHaveLength(2)
  })

  it('source filter chip filters to only words from that source', () => {
    render(<VocabularyPage />)
    // Cinema has 1 new word (Ethereal)
    const chips = screen.getAllByTestId('source-filter-chip')
    const cinemaChip = chips.find((c) => c.textContent === 'Cinema')!
    fireEvent.click(cinemaChip)
    const cards = screen.getAllByTestId('vocab-card')
    expect(cards).toHaveLength(1)
    expect(screen.getByText('Ethereal')).toBeInTheDocument()
  })

  it('shows empty state when no words match filters', () => {
    render(<VocabularyPage />)
    const input = screen.getByTestId('vocab-search-input')
    fireEvent.change(input, { target: { value: 'xyznonexistent' } })
    expect(screen.getByTestId('empty-vocab-state')).toBeInTheDocument()
    expect(screen.queryAllByTestId('vocab-card')).toHaveLength(0)
  })
})
