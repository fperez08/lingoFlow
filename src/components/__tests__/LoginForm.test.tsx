import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginForm from '../LoginForm'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Mock the router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
  },
}))

describe('LoginForm', () => {
  const queryClient = new QueryClient()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all fields', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LoginForm />
      </QueryClientProvider>
    )

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/6-digit pin/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  it('shows error if PIN is not 6 digits', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LoginForm />
      </QueryClientProvider>
    )

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText(/6-digit pin/i), { target: { value: '123' } })

    fireEvent.submit(screen.getByRole('heading', { name: /login/i }).closest('form')!)

    expect(await screen.findByText(/pin must be exactly 6 digits/i)).toBeInTheDocument()
  })

  it('calls signInWithPassword with correct email and PIN on valid submission', async () => {
    const signInSpy = (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ data: {}, error: null })

    render(
      <QueryClientProvider client={queryClient}>
        <LoginForm />
      </QueryClientProvider>
    )

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText(/6-digit pin/i), { target: { value: '123456' } })

    fireEvent.submit(screen.getByRole('heading', { name: /login/i }).closest('form')!)

    await waitFor(() => {
      expect(signInSpy).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: '123456',
      })
    })
  })

  it('redirects to /dashboard on success', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ data: {}, error: null })

    render(
      <QueryClientProvider client={queryClient}>
        <LoginForm />
      </QueryClientProvider>
    )

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText(/6-digit pin/i), { target: { value: '123456' } })

    fireEvent.submit(screen.getByRole('heading', { name: /login/i }).closest('form')!)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })
})
