import { render, screen, fireEvent } from '@testing-library/react'
import CueText from '../CueText'

describe('CueText', () => {
  const defaultProps = {
    text: 'She sells sea shells',
    cueStart: 10,
    cueEnd: 14,
    currentTime: 10,
  }

  it('renders all words as word-{i} spans', () => {
    render(<CueText {...defaultProps} />)
    expect(screen.getByTestId('word-0')).toHaveTextContent('She')
    expect(screen.getByTestId('word-1')).toHaveTextContent('sells')
    expect(screen.getByTestId('word-2')).toHaveTextContent('sea')
    expect(screen.getByTestId('word-3')).toHaveTextContent('shells')
  })

  it('renders cue-text testid on root element', () => {
    render(<CueText {...defaultProps} />)
    expect(screen.getByTestId('cue-text')).toBeInTheDocument()
  })

  it('highlights first word at currentTime === cueStart', () => {
    render(<CueText {...defaultProps} currentTime={10} />)
    expect(screen.getByTestId('word-0')).toHaveClass('bg-primary')
    expect(screen.getByTestId('word-1')).not.toHaveClass('bg-primary')
  })

  it('highlights middle word at cue midpoint', () => {
    // cue 10→14 (4s), midpoint = 12s → floor(0.5 * 4) = 2 → word-2
    render(<CueText {...defaultProps} currentTime={12} />)
    expect(screen.getByTestId('word-2')).toHaveClass('bg-primary')
    expect(screen.getByTestId('word-0')).not.toHaveClass('bg-primary')
    expect(screen.getByTestId('word-3')).not.toHaveClass('bg-primary')
  })

  it('calls onWordClick with cueStart when any word is clicked', () => {
    const onWordClick = jest.fn()
    render(<CueText {...defaultProps} onWordClick={onWordClick} />)
    fireEvent.click(screen.getByTestId('word-2'))
    expect(onWordClick).toHaveBeenCalledWith(10)
  })

  it('does not throw when onWordClick is not provided and a word is clicked', () => {
    render(<CueText {...defaultProps} />)
    expect(() => fireEvent.click(screen.getByTestId('word-0'))).not.toThrow()
  })

  it('renders empty cue-text with no child spans for empty text', () => {
    render(<CueText text="" cueStart={0} cueEnd={5} currentTime={0} />)
    expect(screen.getByTestId('cue-text')).toBeInTheDocument()
    expect(screen.queryByTestId('word-0')).not.toBeInTheDocument()
  })
})
