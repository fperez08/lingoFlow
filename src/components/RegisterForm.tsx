'use client'

import { useState, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Toast from './Toast'

interface ValidationErrors {
  firstName?: string
  lastName?: string
  username?: string
  email?: string
  pin?: string
}

export default function RegisterForm() {
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const router = useRouter()
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current !== null) {
        clearTimeout(redirectTimerRef.current)
      }
    }
  }, [])

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {}

    if (!firstName.trim()) {
      errors.firstName = 'First Name is required'
    }

    if (!lastName.trim()) {
      errors.lastName = 'Last Name is required'
    }

    if (!username.trim()) {
      errors.username = 'Username is required'
    }

    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!pin) {
      errors.pin = 'PIN is required'
    } else if (pin.length !== 6) {
      errors.pin = 'PIN must be exactly 6 digits'
    } else if (!/^\d+$/.test(pin)) {
      errors.pin = 'PIN must contain only digits'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pin, // Using PIN as the password
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            username,
          },
        },
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      setToast({ message: 'Registration successful! Redirecting to dashboard...', type: 'success' })
      redirectTimerRef.current = setTimeout(() => {
        redirectTimerRef.current = null
        router.push('/dashboard')
      }, 1500)
    },
    onError: (err: Error) => {
      setToast({ message: err.message, type: 'error' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErrors({})

    if (!validateForm()) {
      setToast({ message: 'Please fix the errors below', type: 'error' })
      return
    }

    mutation.mutate()
  }

  return (
    <div className="register-form-container">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <form onSubmit={handleSubmit} className="register-form">
        <h2>Register</h2>
        <div className="field">
          <label htmlFor="firstName">
            First Name <span className="required">*</span>
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={validationErrors.firstName ? 'input-error' : ''}
            aria-invalid={!!validationErrors.firstName}
            aria-describedby={validationErrors.firstName ? 'firstName-error' : undefined}
          />
          {validationErrors.firstName && (
            <span id="firstName-error" className="error-message">
              {validationErrors.firstName}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="lastName">
            Last Name <span className="required">*</span>
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={validationErrors.lastName ? 'input-error' : ''}
            aria-invalid={!!validationErrors.lastName}
            aria-describedby={validationErrors.lastName ? 'lastName-error' : undefined}
          />
          {validationErrors.lastName && (
            <span id="lastName-error" className="error-message">
              {validationErrors.lastName}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="username">
            Username <span className="required">*</span>
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={validationErrors.username ? 'input-error' : ''}
            aria-invalid={!!validationErrors.username}
            aria-describedby={validationErrors.username ? 'username-error' : undefined}
          />
          {validationErrors.username && (
            <span id="username-error" className="error-message">
              {validationErrors.username}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="email">
            Email <span className="required">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={validationErrors.email ? 'input-error' : ''}
            aria-invalid={!!validationErrors.email}
            aria-describedby={validationErrors.email ? 'email-error' : undefined}
          />
          {validationErrors.email && (
            <span id="email-error" className="error-message">
              {validationErrors.email}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="pin">
            6-digit PIN <span className="required">*</span>
          </label>
          <input
            id="pin"
            type="password"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="e.g., 123456"
            className={validationErrors.pin ? 'input-error' : ''}
            aria-invalid={!!validationErrors.pin}
            aria-describedby={validationErrors.pin ? 'pin-error' : undefined}
          />
          {validationErrors.pin && (
            <span id="pin-error" className="error-message">
              {validationErrors.pin}
            </span>
          )}
        </div>
        <button type="submit" disabled={mutation.isPending} className="submit-button">
          {mutation.isPending ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  )
}
