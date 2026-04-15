import { render, screen, fireEvent } from '@testing-library/react'
import TranscriptPanel, { CUES_PER_PAGE } from '../TranscriptPanel'
import { TranscriptCue } from '@/lib/parse-transcript'

function makeCues(count: number): TranscriptCue[] {
  return Array.from({ length: count }, (_, i) => ({
    index: i + 1,
    startTime: `00:00:${String(i * 3).padStart(2, '0')},000`,
    endTime: `00:00:${String(i * 3 + 2).padStart(2, '0')},000`,
    text: `Cue text ${i + 1}`,
  }))
}

const noop = () => {}

beforeEach(() => {
  // scrollIntoView is not implemented in jsdom
  window.HTMLElement.prototype.scrollIntoView = jest.fn()
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('TranscriptPanel', () => {
  it('shows loading state when loading=true', () => {
    render(
      <TranscriptPanel
        cues={[]}
        activeCueIndex={-1}
        currentPage={0}
        onPageChange={noop}
        loading={true}
      />
    )
    expect(screen.getByTestId('transcript-panel')).toBeInTheDocument()
    expect(screen.getByText(/loading transcript/i)).toBeInTheDocument()
  })

  it('shows empty state when cues=[] and loading=false', () => {
    render(
      <TranscriptPanel
        cues={[]}
        activeCueIndex={-1}
        currentPage={0}
        onPageChange={noop}
        loading={false}
      />
    )
    expect(screen.getByTestId('transcript-panel')).toBeInTheDocument()
    expect(screen.getByText(/no transcript available/i)).toBeInTheDocument()
  })

  it('renders only CUES_PER_PAGE cues on each page', () => {
    const cues = makeCues(25)
    render(
      <TranscriptPanel
        cues={cues}
        activeCueIndex={-1}
        currentPage={0}
        onPageChange={noop}
        loading={false}
      />
    )
    // CUES_PER_PAGE cues should be visible on page 0
    for (let i = 0; i < CUES_PER_PAGE; i++) {
      expect(screen.getByText(`Cue text ${i + 1}`)).toBeInTheDocument()
    }
    // Cue 11 (page 1) should not be rendered
    expect(screen.queryByText(`Cue text ${CUES_PER_PAGE + 1}`)).not.toBeInTheDocument()
  })

  it('highlights the active cue with data-testid="cue-active" and border-primary class', () => {
    const cues = makeCues(5)
    render(
      <TranscriptPanel
        cues={cues}
        activeCueIndex={2}
        currentPage={0}
        onPageChange={noop}
        loading={false}
      />
    )
    const activeCue = screen.getByTestId('cue-active')
    expect(activeCue).toBeInTheDocument()
    expect(activeCue.className).toContain('border-primary')
  })

  it('Prev button is disabled on page 0', () => {
    const cues = makeCues(25)
    render(
      <TranscriptPanel
        cues={cues}
        activeCueIndex={-1}
        currentPage={0}
        onPageChange={noop}
        loading={false}
      />
    )
    expect(screen.getByTestId('transcript-prev-page')).toBeDisabled()
  })

  it('Next button is disabled on last page', () => {
    const cues = makeCues(15)
    const totalPages = Math.ceil(cues.length / CUES_PER_PAGE)
    render(
      <TranscriptPanel
        cues={cues}
        activeCueIndex={-1}
        currentPage={totalPages - 1}
        onPageChange={noop}
        loading={false}
      />
    )
    expect(screen.getByTestId('transcript-next-page')).toBeDisabled()
  })

  it('clicking Next calls onPageChange(1)', () => {
    const cues = makeCues(25)
    const onPageChange = jest.fn()
    render(
      <TranscriptPanel
        cues={cues}
        activeCueIndex={-1}
        currentPage={0}
        onPageChange={onPageChange}
        loading={false}
      />
    )
    fireEvent.click(screen.getByTestId('transcript-next-page'))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('calls scrollIntoView on active cue element', () => {
    const cues = makeCues(5)
    render(
      <TranscriptPanel
        cues={cues}
        activeCueIndex={1}
        currentPage={0}
        onPageChange={noop}
        loading={false}
      />
    )
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('shows correct page indicator', () => {
    const cues = makeCues(25)
    render(
      <TranscriptPanel
        cues={cues}
        activeCueIndex={-1}
        currentPage={1}
        onPageChange={noop}
        loading={false}
      />
    )
    expect(screen.getByTestId('transcript-page-indicator')).toHaveTextContent('2 / 3')
  })

  it('does not show pagination when all cues fit on one page', () => {
    const cues = makeCues(5)
    render(
      <TranscriptPanel
        cues={cues}
        activeCueIndex={-1}
        currentPage={0}
        onPageChange={noop}
        loading={false}
      />
    )
    expect(screen.queryByTestId('transcript-prev-page')).not.toBeInTheDocument()
    expect(screen.queryByTestId('transcript-next-page')).not.toBeInTheDocument()
  })
})
