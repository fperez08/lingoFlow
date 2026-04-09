import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

  it('renders all fields', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RegisterForm />
      </QueryClientProvider>
    )

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
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

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'johndoe' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText(/6-digit pin/i), { target: { value: '123' } })
    
    fireEvent.submit(screen.getByRole('heading', { name: /register/i }).closest('form')!)

    expect(await screen.findByText(/pin must be exactly 6 digits/i)).toBeInTheDocument()
  })

  it('calls signUp with correct data on submission', async () => {
    const signUpSpy = (supabase.auth.signUp as jest.Mock).mockResolvedValue({ data: {}, error: null })
    
    render(
      <QueryClientProvider client={queryClient}>
        <RegisterForm />
      </QueryClientProvider>
    )

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'johndoe' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText(/6-digit pin/i), { target: { value: '123456' } })
    
    fireEvent.submit(screen.getByRole('heading', { name: /register/i }).closest('form')!)

    await waitFor(() => {
      expect(signUpSpy).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: '123456',
        options: {
          data: {
            first_name: 'John',
            last_name: 'Doe',
            username: 'johndoe',
          },
        },
      })
    })
  })
})
