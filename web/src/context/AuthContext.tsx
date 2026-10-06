/**
 * Auth Context & Guard per Task 2 [F1-8].
 * Manages user authentication state, session validation,
 * and automatic redirection upon session expiration.
 */
import React, { createContext, useContext, useEffect, useState } from 'react'
import type { AuthUser } from '../types'

export interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, token?: string) => Promise<boolean>
  logout: () => Promise<void>
  checkSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const checkSession = async (): Promise<boolean> => {
    try {
      // Check stored session or query verification endpoint
      const savedUser = localStorage.getItem('vynl_user')
      const sessionExpiry = localStorage.getItem('vynl_session_expiry')

      if (savedUser && sessionExpiry) {
        if (Date.now() > parseInt(sessionExpiry, 10)) {
          // Session expired
          await logout()
          return false
        }
        setUser(JSON.parse(savedUser))
        return true
      }
      setUser(null)
      return false
    } catch {
      setUser(null)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkSession()
  }, [])

  const login = async (username: string, token: string = 'dev-token'): Promise<boolean> => {
    const newUser: AuthUser = {
      user_id: `user-${username.toLowerCase().replace(/\s+/g, '_')}`,
      username,
      is_authenticated: true,
    }

    // Set 14-day expiry
    const expiry = Date.now() + 14 * 24 * 60 * 60 * 1000
    localStorage.setItem('vynl_user', JSON.stringify(newUser))
    localStorage.setItem('vynl_session_expiry', expiry.toString())
    localStorage.setItem('vynl_session', token)

    setUser(newUser)
    return true
  }

  const logout = async (): Promise<void> => {
    localStorage.removeItem('vynl_user')
    localStorage.removeItem('vynl_session_expiry')
    localStorage.removeItem('vynl_session')
    setUser(null)
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
