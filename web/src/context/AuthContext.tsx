/**
 * Auth Context & Guard per Task 2 [F1-8].
 * Manages user authentication state, session validation,
 * and automatic redirection upon session expiration.
 */
import React, { createContext, useContext, useEffect, useState } from 'react'
import type { AuthUser } from '../types'
import { api } from '../services/apiClient'

export interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (returnTo?: string) => Promise<boolean>
  logout: () => Promise<void>
  checkSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function safeReturnTo(candidate: string | null | undefined): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) return '/'
  try {
    const target = new URL(candidate, window.location.origin)
    if (target.origin !== window.location.origin) return '/'
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return '/'
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const checkSession = async (): Promise<boolean> => {
    try {
      const session = await api.get<{ user_id: string; display_name: string; avatar_url?: string }>(
        '/v1/auth/me',
        { skipAuth: true }
      )
      setUser({
        user_id: session.user_id,
        username: session.display_name,
        avatar_url: session.avatar_url,
        is_authenticated: true,
      })
      return true
    } catch {
      setUser(null)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void checkSession()
    const onUnauthorized = () => setUser(null)
    window.addEventListener('vynl:unauthorized', onUnauthorized)
    return () => window.removeEventListener('vynl:unauthorized', onUnauthorized)
  }, [])

  const login = async (returnTo: string = '/'): Promise<boolean> => {
    const safeTarget = safeReturnTo(returnTo)
    const query = new URLSearchParams({ return_to: safeTarget })
    window.location.assign(`/v1/auth/google/start?${query.toString()}`)
    return true
  }

  const logout = async (): Promise<void> => {
    try {
      await api.post('/v1/auth/logout', undefined, { skipAuth: true })
    } finally {
      setUser(null)
      window.dispatchEvent(new Event('vynl:session-ended'))
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user?.is_authenticated,
        isLoading,
        login,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
