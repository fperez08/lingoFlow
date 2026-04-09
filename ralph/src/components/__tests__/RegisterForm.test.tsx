import { render, screen, fireEvent } from '@testing-library/react'
import RegisterForm from '../RegisterForm'
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
      signUp: jest.fn(),
    },
  },
}))

describe('RegisterForm', () => {
  const queryClient = new QueryClient()

  it('renders email and PIN fields', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RegisterForm />
      </QueryClientProvider>
    )

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/6-digit pin/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
  })

  it('shows error if PIN is not 6 digits', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RegisterForm />
      </QueryClientProvider>
    )

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText(/6-digit pin/i), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    expect(await screen.findByText(/pin must be exactly 6 digits/i)).toBeInTheDocument()
  })
})
