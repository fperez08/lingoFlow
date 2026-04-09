import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from '../page'

jest.mock('@/components/ImportVideoModal', () => {
  return function MockImportVideoModal() {
    return null
  }
})

const mockVideos = [
  {
    id: 'v1',
    title: 'Video One',
    author_name: 'Author One',
    thumbnail_url: 'https://example.com/thumb1.jpg',
    youtube_url: 'https://youtube.com/watch?v=1',
    tags: ['tag1'],
    created_at: '2026-04-10T00:00:00Z',
  },
  {
    id: 'v2',
    title: 'Video Two',
    author_name: 'Author Two',
    thumbnail_url: 'https://example.com/thumb2.jpg',
    youtube_url: 'https://youtube.com/watch?v=2',
    tags: [],
    created_at: '2026-04-09T00:00:00Z',
  },
]

describe('DashboardPage', () => {
  afterEach(() => jest.clearAllMocks())

  it('shows loading state initially', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock
    render(<DashboardPage />)
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
  })

  it('renders video grid after fetching videos', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve(mockVideos),
    }) as jest.Mock

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('video-grid')).toBeInTheDocument()
    })

    expect(screen.getByTestId('video-card-v1')).toBeInTheDocument()
    expect(screen.getByTestId('video-card-v2')).toBeInTheDocument()
    expect(screen.getByText('Video One')).toBeInTheDocument()
    expect(screen.getByText('Video Two')).toBeInTheDocument()
  })

  it('shows empty state when no videos', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve([]),
    }) as jest.Mock

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    expect(screen.getByText('No videos imported yet')).toBeInTheDocument()
  })

  it('shows empty state on fetch error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.Mock

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
  })

  it('keeps the Import Video button', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve([]),
    }) as jest.Mock

    render(<DashboardPage />)

    await waitFor(() => screen.getByTestId('empty-state'))
    expect(screen.getByRole('button', { name: /import video/i })).toBeInTheDocument()
  })
})
