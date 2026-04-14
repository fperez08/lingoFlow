import { render, screen } from '@testing-library/react'
import PlayerPage from '../page'

jest.mock('@/components/PlayerLoader', () => ({
  __esModule: true,
  default: ({ id }: { id: string }) => <div data-testid="player-loader">{id}</div>,
}))

describe('PlayerPage', () => {
  it('renders PlayerLoader with the route id', async () => {
    const Page = await PlayerPage({ params: Promise.resolve({ id: 'video-1' }) })
    render(Page as React.ReactElement)
    expect(screen.getByTestId('player-loader')).toHaveTextContent('video-1')
  })
})
