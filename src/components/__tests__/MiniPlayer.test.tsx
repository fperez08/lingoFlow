import { render, screen, fireEvent } from '@testing-library/react'
import MiniPlayer from '../MiniPlayer'

describe('MiniPlayer', () => {
  it('renders the iframe with correct YouTube embed src', () => {
    render(<MiniPlayer youtubeId="abc123" title="My Video" onClose={jest.fn()} />)
    const iframe = screen.getByTestId('mini-player-iframe')
    expect(iframe).toHaveAttribute(
      'src',
      'https://www.youtube.com/embed/abc123?autoplay=1&enablejsapi=1&rel=0&modestbranding=1'
    )
  })

  it('renders the iframe with the correct title', () => {
    render(<MiniPlayer youtubeId="abc123" title="My Video" onClose={jest.fn()} />)
    const iframe = screen.getByTestId('mini-player-iframe')
    expect(iframe).toHaveAttribute('title', 'My Video')
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn()
    render(<MiniPlayer youtubeId="abc123" title="My Video" onClose={onClose} />)
    fireEvent.click(screen.getByTestId('mini-player-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders the close button with accessible label', () => {
    render(<MiniPlayer youtubeId="abc123" title="My Video" onClose={jest.fn()} />)
    expect(screen.getByLabelText('Close mini player')).toBeInTheDocument()
  })

  it('has the mini-player data-testid', () => {
    render(<MiniPlayer youtubeId="abc123" title="My Video" onClose={jest.fn()} />)
    expect(screen.getByTestId('mini-player')).toBeInTheDocument()
  })
})
