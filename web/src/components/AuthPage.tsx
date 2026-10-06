/** Google sign-in entry point and protected-route guard. */
import React from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { safeReturnTo, useAuth } from '../context/AuthContext'

export const SignInPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth()
  const [params] = useSearchParams()
  const returnTo = safeReturnTo(params.get('next'))

  if (isAuthenticated) return <Navigate to={returnTo} replace />

  return (
    <div data-testid="signin-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '36px', borderRadius: 'var(--radius-xl)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 className="font-display" style={{ fontSize: '26px', color: '#FFFFFF', marginBottom: '6px' }}>Sign In to VYNL</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Continue securely with your Google account.</p>
        </div>
        <button
          type="button"
          data-testid="signin-google"
          className="btn-primary"
          style={{ width: '100%', height: '44px', marginTop: '8px' }}
          onClick={() => void login(returnTo)}
        >
          <LogIn size={16} /> Sign in with Google
        </button>
      </div>
    </div>
  )
}

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <div data-testid="auth-loading" style={{ padding: '60px', textAlign: 'center' }}>Loading session...</div>
  if (!isAuthenticated) {
    const next = safeReturnTo(`${location.pathname}${location.search}${location.hash}`)
    return <Navigate to={`/sign-in?next=${encodeURIComponent(next)}`} replace />
  }
  return <>{children}</>
}
