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

  beforeEach(() => {
    jest.clearAllMocks()
  })

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

  it('validates required fields', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RegisterForm />
      </QueryClientProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByText('First Name is required')).toBeInTheDocument()
      expect(screen.getByText('Last Name is required')).toBeInTheDocument()
      expect(screen.getByText('Username is required')).toBeInTheDocument()
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('PIN is required')).toBeInTheDocument()
    })
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

    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByText('PIN must be exactly 6 digits')).toBeInTheDocument()
    })
  })

  it('shows error for invalid email format', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RegisterForm />
      </QueryClientProvider>
    )

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'johndoe' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'invalid-email' } })
    fireEvent.change(screen.getByLabelText(/6-digit pin/i), { target: { value: '123456' } })

    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('shows error if PIN contains non-digit characters', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RegisterForm />
      </QueryClientProvider>
    )

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'johndoe' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText(/6-digit pin/i), { target: { value: '12345a' } })

    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByText('PIN must contain only digits')).toBeInTheDocument()
    })
  })

  it('calls signUp with correct data on valid submission', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: /register/i }))

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

  it('displays success toast on successful registration', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({ data: {}, error: null })

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

    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByText(/registration successful/i)).toBeInTheDocument()
    })
  })

  it('displays error toast on registration failure', async () => {
    const errorMessage = 'User already exists'
    ;(supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: null,
      error: new Error(errorMessage),
    })

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

    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    }, { timeout: 1000 })
  })

  it('marks inputs as invalid when there are validation errors', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RegisterForm />
      </QueryClientProvider>
    )

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'invalid' } })
    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      expect(emailInput).toHaveClass('input-error')
      expect(emailInput).toHaveAttribute('aria-invalid', 'true')
    })
  })
})

