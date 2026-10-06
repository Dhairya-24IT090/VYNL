import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '../src/context/AuthContext'
import { SignInPage, AuthGuard } from '../src/components/AuthPage'

const TestProtectedComponent = () => {
  const { user, logout } = useAuth()
  return (
    <div>
      <span data-testid="user-display">Welcome, {user?.username}</span>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  )
}

describe('Task 2 [F1-8]: Sign-in page and Auth Guard', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('keeps user signed in across page refresh if session is valid', async () => {
    // Setup stored valid session
    const validUser = { user_id: 'user-dhairya', username: 'Dhairya', is_authenticated: true }
    const futureExpiry = Date.now() + 14 * 24 * 60 * 60 * 1000
    localStorage.setItem('vynl_user', JSON.stringify(validUser))
    localStorage.setItem('vynl_session_expiry', futureExpiry.toString())
    localStorage.setItem('vynl_session', 'mock-token-xyz')

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <TestProtectedComponent />
                </AuthGuard>
              }
            />
            <Route path="/sign-in" element={<SignInPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )

    // User is maintained without needing to sign in again
    await waitFor(() => {
      expect(screen.getByTestId('user-display')).toHaveTextContent('Welcome, Dhairya')
    })
    expect(screen.queryByTestId('signin-page')).not.toBeInTheDocument()
  })

  it('redirects to /sign-in when session has expired', async () => {
    // Setup stored expired session (timestamp in the past)
    const expiredUser = { user_id: 'user-old', username: 'OldUser', is_authenticated: true }
    const pastExpiry = Date.now() - 1000
    localStorage.setItem('vynl_user', JSON.stringify(expiredUser))
    localStorage.setItem('vynl_session_expiry', pastExpiry.toString())
    localStorage.setItem('vynl_session', 'expired-token')

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <TestProtectedComponent />
                </AuthGuard>
              }
            />
            <Route path="/sign-in" element={<SignInPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )

    // Should redirect to /sign-in and clear expired items
    await waitFor(() => {
      expect(screen.getByTestId('signin-page')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('user-display')).not.toBeInTheDocument()
    expect(localStorage.getItem('vynl_user')).toBeNull()
  })

  it('allows user to sign in through form and sets 14-day expiry', async () => {
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/sign-in']}>
          <Routes>
            <Route path="/sign-in" element={<SignInPage />} />
            <Route
              path="/"
              element={
                <AuthGuard>
                  <TestProtectedComponent />
                </AuthGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )

    const usernameInput = screen.getByTestId('signin-username')
    const submitBtn = screen.getByTestId('signin-submit-btn')

    await user.type(usernameInput, 'Alex')
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByTestId('user-display')).toHaveTextContent('Welcome, Alex')
    })

    const storedUser = JSON.parse(localStorage.getItem('vynl_user') || '{}')
    expect(storedUser.username).toBe('Alex')
    const storedExpiry = parseInt(localStorage.getItem('vynl_session_expiry') || '0', 10)
    expect(storedExpiry).toBeGreaterThan(Date.now() + 13 * 24 * 60 * 60 * 1000)
  })
})
