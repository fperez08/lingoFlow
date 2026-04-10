import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from '../page'

jest.mock('@/components/ImportVideoModal', () => {
  return function MockImportVideoModal() {
    return null
  }
})

jest.mock('@/hooks/useVideos')
jest.mock('@/hooks/useVideoMutations')

import { useVideos } from '@/hooks/useVideos'
import { useVideoMutations } from '@/hooks/useVideoMutations'

const mockDeleteMutate = jest.fn()
const mockRefreshVideos = jest.fn()

const defaultMutations = {
  deleteVideo: { mutate: mockDeleteMutate, isPending: false },
  refreshVideos: mockRefreshVideos,
}

const mockVideos = [
  {
    id: 'v1',
    title: 'Video One',
    author_name: 'Author One',
    thumbnail_url: 'https://example.com/thumb1.jpg',
    youtube_url: 'https://youtube.com/watch?v=1',
    youtube_id: '1',
    transcript_path: 'path/v1.srt',
    transcript_format: 'srt',
    tags: ['tag1'],
    created_at: '2026-04-10T00:00:00Z',
    updated_at: '2026-04-10T00:00:00Z',
  },
  {
    id: 'v2',
    title: 'Video Two',
    author_name: 'Author Two',
    thumbnail_url: 'https://example.com/thumb2.jpg',
    youtube_url: 'https://youtube.com/watch?v=2',
    youtube_id: '2',
    transcript_path: 'path/v2.srt',
    transcript_format: 'srt',
    tags: [],
    created_at: '2026-04-09T00:00:00Z',
    updated_at: '2026-04-09T00:00:00Z',
  },
]

describe('DashboardPage', () => {
  beforeEach(() => {
    ;(useVideoMutations as jest.Mock).mockReturnValue(defaultMutations)
  })

  afterEach(() => jest.clearAllMocks())

  it('shows loading state initially', () => {
    ;(useVideos as jest.Mock).mockReturnValue({ data: undefined, isLoading: true, error: null })
    render(<DashboardPage />)
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
  })

  it('renders video grid after fetching videos', async () => {
    ;(useVideos as jest.Mock).mockReturnValue({ data: mockVideos, isLoading: false, error: null })
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
    ;(useVideos as jest.Mock).mockReturnValue({ data: [], isLoading: false, error: null })
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    expect(screen.getByText('No videos imported yet')).toBeInTheDocument()
  })

  it('shows empty state on fetch error', async () => {
    ;(useVideos as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    })
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
  })

  it('keeps the Import Video button', async () => {
    ;(useVideos as jest.Mock).mockReturnValue({ data: [], isLoading: false, error: null })
    render(<DashboardPage />)

    await waitFor(() => screen.getByTestId('empty-state'))
    expect(screen.getByRole('button', { name: /import video/i })).toBeInTheDocument()
  })
})
