/**
 * Sign-in Page & Auth Guard per Task 2 [F1-8].
 * Renders glassmorphic sign-in interface and redirects unauthenticated users.
 */
import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LogIn, Lock, User, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export const SignInPage: React.FC = () => {
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      setError('Username is required')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await login(username)
      navigate('/')
    } catch (err: any) {
      setError(err?.message || 'Authentication failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      data-testid="signin-page"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '36px',
          borderRadius: 'var(--radius-xl)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 className="font-display" style={{ fontSize: '26px', color: '#FFFFFF', marginBottom: '6px' }}>
            Sign In to VYNL
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Enter your credentials to access personalized playlists and insights.
          </p>
        </div>

        {error && (
          <div
            data-testid="auth-error-alert"
            className="glass-panel"
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--color-danger-glass)',
              borderColor: 'var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              color: '#FFFFFF',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <input
                data-testid="signin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Dhairya"
                className="input-glass"
                style={{ paddingLeft: '38px' }}
                autoFocus
              />
              <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                data-testid="signin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-glass"
                style={{ paddingLeft: '38px' }}
              />
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
            </div>
          </div>

          <button
            data-testid="signin-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
            style={{ width: '100%', height: '44px', marginTop: '8px' }}
          >
            <LogIn size={16} /> Sign In
          </button>
        </form>
      </div>
    </div>
  )
}

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div data-testid="auth-loading" style={{ padding: '60px', textAlign: 'center' }}>Loading session...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />
  }

  return <>{children}</>
}
