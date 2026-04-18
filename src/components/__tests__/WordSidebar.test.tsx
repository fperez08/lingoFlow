import { render, screen, fireEvent } from '@testing-library/react'
import WordSidebar from '../WordSidebar'
import { VocabInfo } from '@/lib/vocabulary'

const mockVocabEntry: VocabInfo = {
  level: 'B2',
  definition: 'The occurrence and development of events by chance in a happy or beneficial way',
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
    expect(screen.getByText(mockVocabEntry.definition!)).toBeInTheDocument()
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

  it('does not render toggle button when onStatusChange is not provided', () => {
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
      />
    )
    expect(screen.queryByTestId('status-toggle')).not.toBeInTheDocument()
  })

  it('renders "Mark as known" when status is not mastered', () => {
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
        onStatusChange={jest.fn()}
      />
    )
    expect(screen.getByTestId('status-toggle')).toHaveTextContent('Mark as known')
  })

  it('renders "Mark as unknown" when status is mastered', () => {
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={{ ...mockVocabEntry, status: 'mastered' }}
        onClose={jest.fn()}
        onStatusChange={jest.fn()}
      />
    )
    expect(screen.getByTestId('status-toggle')).toHaveTextContent('Mark as unknown')
  })

  it('calls onStatusChange with mastered when clicking Mark as known', () => {
    const onStatusChange = jest.fn()
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
        onStatusChange={onStatusChange}
      />
    )
    fireEvent.click(screen.getByTestId('status-toggle'))
    expect(onStatusChange).toHaveBeenCalledWith('serendipity', 'mastered')
  })

  it('calls onStatusChange with new when clicking Mark as unknown', () => {
    const onStatusChange = jest.fn()
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={{ ...mockVocabEntry, status: 'mastered' }}
        onClose={jest.fn()}
        onStatusChange={onStatusChange}
      />
    )
    fireEvent.click(screen.getByTestId('status-toggle'))
    expect(onStatusChange).toHaveBeenCalledWith('serendipity', 'new')
  })

  it('disables toggle and shows Saving when isUpdating is true', () => {
    render(
      <WordSidebar
        word="serendipity"
        contextSentence="context"
        vocabEntry={mockVocabEntry}
        onClose={jest.fn()}
        onStatusChange={jest.fn()}
        isUpdating={true}
      />
    )
    const btn = screen.getByTestId('status-toggle')
    expect(btn).toBeDisabled()
    expect(btn).toHaveTextContent('Saving…')
  })
})
