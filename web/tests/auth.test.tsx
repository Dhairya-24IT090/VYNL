import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, safeReturnTo, useAuth } from '../src/context/AuthContext'
import { AuthGuard, SignInPage } from '../src/components/AuthPage'
import { api } from '../src/services/apiClient'

function Protected() {
  const { user } = useAuth()
  return <p>Welcome, {user?.username}</p>
}

function response(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 401 ? 'Unauthorized' : 'OK',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  }
}

afterEach(() => vi.restoreAllMocks())

describe('F1-8 cookie-backed sign-in', () => {
  it('bootstraps from /v1/auth/me and never reads or writes browser storage', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    global.fetch = vi.fn().mockResolvedValue(response(200, {
      user_id: 'user-1', display_name: 'Dhairya', avatar_url: 'https://cdn.example/avatar.png',
    })) as any

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/playlists/abc']}>
          <Routes>
            <Route path="/playlists/:id" element={<AuthGuard><Protected /></AuthGuard>} />
            <Route path="/sign-in" element={<SignInPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )
    expect(screen.getByTestId('auth-loading')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Welcome, Dhairya')).toBeInTheDocument())
    expect(fetch).toHaveBeenCalledWith('/v1/auth/me', expect.objectContaining({ credentials: 'include' }))
    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
  })

  it('preserves protected routes and rejects external or script redirects', async () => {
    global.fetch = vi.fn().mockResolvedValue(response(401, { error: { code: 'unauthorized', message: 'Sign in' } })) as any
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/playlists/abc?tab=live']}>
          <Routes>
            <Route path="/playlists/:id" element={<AuthGuard><Protected /></AuthGuard>} />
            <Route path="/sign-in" element={<SignInPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )
    expect(await screen.findByTestId('signin-google')).toHaveTextContent('Sign in with Google')
    expect(safeReturnTo('//evil.com')).toBe('/')
    expect(safeReturnTo('https://evil.com')).toBe('/')
    expect(safeReturnTo('javascript:alert(1)')).toBe('/')
    expect(safeReturnTo('/playlists/abc?tab=live')).toBe('/playlists/abc?tab=live')
  })

  it('coalesces parallel 401 responses to one unauthorized event', async () => {
    let calls = 0
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/v1/auth/me') return response(200, { user_id: 'u', display_name: 'User' }) as any
      calls += 1
      return response(401, { error: { code: 'unauthorized', message: 'Expired' } }) as any
    }) as any
    const onUnauthorized = vi.fn()
    window.addEventListener('vynl:unauthorized', onUnauthorized)
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/playlists/abc']}>
          <Routes>
            <Route path="/playlists/:id" element={<AuthGuard><Protected /></AuthGuard>} />
            <Route path="/sign-in" element={<SignInPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )
    await screen.findByText('Welcome, User')
    const results = await Promise.allSettled([api.get('/v1/probe/1'), api.get('/v1/probe/2'), api.get('/v1/probe/3')])
    expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected', 'rejected'])
    expect(results.every((result) => result.status === 'rejected' && (result.reason as Error & { status: number }).status === 401)).toBe(true)
    await screen.findByTestId('signin-google')
    expect(calls).toBe(3)
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    window.removeEventListener('vynl:unauthorized', onUnauthorized)
  })
})
