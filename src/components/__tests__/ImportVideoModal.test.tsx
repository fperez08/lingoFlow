import { render, screen, fireEvent } from '@testing-library/react'
import ImportVideoModal from '../ImportVideoModal'

describe('ImportVideoModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ImportVideoModal isOpen={false} onClose={() => {}} onSuccess={() => {}} />
    )
    expect(container.querySelector('.modal-overlay')).not.toBeInTheDocument()
  })

  it('renders all form fields when isOpen is true', () => {
    render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)

    expect(screen.getByTestId('video-file-input')).toBeInTheDocument()
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/author/i)).toBeInTheDocument()
    expect(screen.getByTestId('transcript-input')).toBeInTheDocument()
    expect(screen.getByLabelText(/tags/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import video/i })).toBeInTheDocument()
  })

  it('disables submit button when no transcript file selected', async () => {
    render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)
    const submitButton = screen.getByRole('button', { name: /import video/i })
    expect(submitButton).toBeDisabled()
  })

  it('closes modal on close button click', () => {
    const onClose = jest.fn()
    render(<ImportVideoModal isOpen={true} onClose={onClose} onSuccess={() => {}} />)

    const closeButton = screen.getByLabelText('Close modal')
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('closes modal on cancel button click', () => {
    const onClose = jest.fn()
    render(<ImportVideoModal isOpen={true} onClose={onClose} onSuccess={() => {}} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('shows Upload File and Paste Text buttons', () => {
    render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)
    expect(screen.getByTestId('transcript-mode-upload')).toBeInTheDocument()
    expect(screen.getByTestId('transcript-mode-paste')).toBeInTheDocument()
  })

  it('defaults to upload mode showing the file input', () => {
    render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)
    expect(screen.getByTestId('transcript-input')).toBeInTheDocument()
    expect(screen.queryByTestId('transcript-paste-input')).not.toBeInTheDocument()
  })

  it('switches to paste mode showing textarea and hiding file input', () => {
    render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)
    fireEvent.click(screen.getByTestId('transcript-mode-paste'))
    expect(screen.getByTestId('transcript-paste-input')).toBeInTheDocument()
    expect(screen.queryByTestId('transcript-input')).not.toBeInTheDocument()
  })

  it('switches back to upload mode showing file input and hiding textarea', () => {
    render(<ImportVideoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />)
    fireEvent.click(screen.getByTestId('transcript-mode-paste'))
    fireEvent.click(screen.getByTestId('transcript-mode-upload'))
    expect(screen.getByTestId('transcript-input')).toBeInTheDocument()
    expect(screen.queryByTestId('transcript-paste-input')).not.toBeInTheDocument()
  })
})
