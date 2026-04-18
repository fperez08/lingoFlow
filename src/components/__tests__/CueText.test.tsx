import { render, screen, fireEvent } from '@testing-library/react'
import CueText from '../CueText'
import { VocabWord } from '@/lib/vocabulary'

const mockVocabMap = new Map<string, VocabWord>([
  ['ethereal', { id: '1', word: 'Ethereal', level: 'B2', definition: 'Delicate', contextQuote: '', source: 'Cinema', status: 'new' }],
  ['resilient', { id: '6', word: 'Resilient', level: 'B1', definition: 'Recovers quickly', contextQuote: '', source: 'Tech', status: 'learning' }],
  ['ambiguous', { id: '7', word: 'Ambiguous', level: 'B1', definition: 'Open to interpretation', contextQuote: '', source: 'Cinema', status: 'mastered' }],
])

describe('CueText', () => {
  it('renders all words in the cue text', () => {
    render(<CueText text="Hello world" vocabMap={new Map()} onWordClick={jest.fn()} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('world')).toBeInTheDocument()
  })

  it('renders word spans as role=button', () => {
    render(<CueText text="Hello world" vocabMap={new Map()} onWordClick={jest.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(2)
  })

  it('calls onWordClick with word and sentence on click', () => {
    const onWordClick = jest.fn()
    render(<CueText text="Hello world" vocabMap={new Map()} onWordClick={onWordClick} />)
    fireEvent.click(screen.getByText('Hello'))
    expect(onWordClick).toHaveBeenCalledWith('Hello', 'Hello world')
  })

  it('stops propagation so cue seek is not triggered', () => {
    const onWordClick = jest.fn()
    const parentClick = jest.fn()
    const { container } = render(
      <div onClick={parentClick}>
        <CueText text="Hello" vocabMap={new Map()} onWordClick={onWordClick} />
      </div>
    )
    fireEvent.click(container.querySelector('[role="button"]')!)
    expect(onWordClick).toHaveBeenCalled()
    expect(parentClick).not.toHaveBeenCalled()
  })

  it('applies vocab status styles for known words', () => {
    render(<CueText text="ethereal resilient ambiguous" vocabMap={mockVocabMap} onWordClick={jest.fn()} />)
    const ethereal = screen.getByTestId('word-ethereal')
    const resilient = screen.getByTestId('word-resilient')
    const ambiguous = screen.getByTestId('word-ambiguous')

    expect(ethereal.className).toMatch(/red/)
    expect(resilient.className).toMatch(/yellow/)
    expect(ambiguous.className).toMatch(/green/)
  })

  it('uses default style for words not in vocab', () => {
    render(<CueText text="unknown" vocabMap={new Map()} onWordClick={jest.fn()} />)
    const word = screen.getByTestId('word-unknown')
    expect(word.className).not.toMatch(/red|yellow|green/)
  })

  it('does not create clickable spans for punctuation', () => {
    render(<CueText text="Hello, world!" vocabMap={new Map()} onWordClick={jest.fn()} />)
    const buttons = screen.getAllByRole('button')
    // Only 'Hello' and 'world' are words; comma, space, ! are punct
    expect(buttons.length).toBe(2)
  })
})
