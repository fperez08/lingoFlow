import { render, screen, fireEvent } from '@testing-library/react'
import PlaybackProgress from '../PlaybackProgress'

describe('PlaybackProgress', () => {
  it('renders with zero time and zero duration', () => {
    render(<PlaybackProgress currentTime={0} duration={0} />)
    expect(screen.getByTestId('playback-progress')).toBeInTheDocument()
    expect(screen.getByTestId('current-time')).toHaveTextContent('0:00')
    expect(screen.getByTestId('duration')).toHaveTextContent('0:00')
  })

  it('renders bar fill at 0% when duration is 0', () => {
    render(<PlaybackProgress currentTime={0} duration={0} />)
    const fill = screen.getByTestId('progress-bar-fill')
    expect(fill).toHaveStyle({ width: '0%' })
  })

  it('renders correct time labels for currentTime=90 duration=300', () => {
    render(<PlaybackProgress currentTime={90} duration={300} />)
    expect(screen.getByTestId('current-time')).toHaveTextContent('1:30')
    expect(screen.getByTestId('duration')).toHaveTextContent('5:00')
  })

  it('renders bar fill at 30% for currentTime=90 duration=300', () => {
    render(<PlaybackProgress currentTime={90} duration={300} />)
    const fill = screen.getByTestId('progress-bar-fill')
    expect(fill).toHaveStyle({ width: '30%' })
  })

  it('does not change displayed time when the progress bar area is clicked', () => {
    render(<PlaybackProgress currentTime={90} duration={300} />)
    fireEvent.click(screen.getByTestId('playback-progress'))
    // Time labels should remain unchanged — no seek interaction
    expect(screen.getByTestId('current-time')).toHaveTextContent('1:30')
    expect(screen.getByTestId('duration')).toHaveTextContent('5:00')
  })

  it('formats single-digit seconds with leading zero', () => {
    render(<PlaybackProgress currentTime={65} duration={125} />)
    expect(screen.getByTestId('current-time')).toHaveTextContent('1:05')
    expect(screen.getByTestId('duration')).toHaveTextContent('2:05')
  })
})
