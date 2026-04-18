import { render, screen, fireEvent } from '@testing-library/react'
import WordSidebar from '../WordSidebar'
import { VocabWord } from '@/lib/vocabulary'

const mockVocabEntry: VocabWord = {
  id: '4',
  word: 'Serendipity',
  level: 'B2',
  definition: 'The occurrence and development of events by chance in a happy or beneficial way',
  contextQuote: 'It was pure serendipity',
  source: 'Cinema',
  status: 'learning',
}

describe('WordSidebar', () => {
  it('renders the selected word', () => {
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="It was pure serendipity that we met"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
      />
    )
    expect(screen.getByTestId('sidebar-word')).toHaveTextContent('serendipity')
  })

  it('renders the context sentence', () => {
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="It was pure serendipity that we met"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
      />
    )
    expect(screen.getByTestId('sidebar-context')).toHaveTextContent('It was pure serendipity that we met')
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn()
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={undefined}
        onClose={onClose}
      />
    )
    fireEvent.click(screen.getByTestId('word-sidebar-close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = jest.fn()
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={undefined}
        onClose={onClose}
      />
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('renders vocab definition when entry is provided', () => {
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
      />
    )
    expect(screen.getByText(mockVocabEntry.definition)).toBeInTheDocument()
  })

  it('does not render definition when no vocab entry', () => {
    render(
      <WordSidebar
        word="hello"
        contextSentence="context"
        vocabEntry={undefined}
        onClose={jest.fn()}
      />
    )
    expect(screen.queryByText(/The occurrence/)).not.toBeInTheDocument()
  })
})
