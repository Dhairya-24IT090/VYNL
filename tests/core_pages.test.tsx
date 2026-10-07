import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppContent } from '../src/App'
import { AuthProvider } from '../src/context/AuthContext'
import { PlayerProvider } from '../src/context/PlayerContext'
import { BackdropProvider } from '../src/context/BackdropContext'

describe('Task 40 [F18-3]: Core Pages reachability', () => {
  beforeEach(() => {
    localStorage.clear()
    const validUser = { user_id: 'user-core', username: 'CoreUser', is_authenticated: true }
    localStorage.setItem('vynl_user', JSON.stringify(validUser))
    localStorage.setItem('vynl_session_expiry', (Date.now() + 10000000).toString())
    vi.clearAllMocks()
  })

  const renderAtRoute = (initialPath: string) => {
    return render(
      <AuthProvider>
        <PlayerProvider>
          <BackdropProvider>
            <MemoryRouter initialEntries={[initialPath]}>
              <AppContent />
            </MemoryRouter>
          </BackdropProvider>
        </PlayerProvider>
      </AuthProvider>
    )
  }

  it('renders Discover Page at route "/"', () => {
    renderAtRoute('/')
    expect(screen.getByTestId('page-discover')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Discover Music' })).toBeInTheDocument()
    expect(screen.getByTestId('search-input')).toBeInTheDocument()
    expect(screen.getByText('Recommended For You')).toBeInTheDocument()
  })

  it('renders Playlists Page at route "/playlists"', () => {
    renderAtRoute('/playlists')
    expect(screen.getByTestId('page-playlists')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your Playlists' })).toBeInTheDocument()
    expect(screen.getByTestId('tab-collab-playlist')).toBeInTheDocument()
  })

  it('renders AI Generation Wizard Page at route "/wizard"', () => {
    renderAtRoute('/wizard')
    expect(screen.getByTestId('wizard-container')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'AI Playlist Generator' })).toBeInTheDocument()
  })

  it('renders Monthly Wrap Page at route "/wrap"', () => {
    renderAtRoute('/wrap')
    expect(screen.getByTestId('wrap-container')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Monthly Wrap' })).toBeInTheDocument()
  })

  it('renders Lyrics Screen at route "/lyrics"', () => {
    renderAtRoute('/lyrics')
    expect(screen.getByTestId('lyrics-screen')).toBeInTheDocument()
    expect(screen.getByTestId('backdrop-toolbar')).toBeInTheDocument()
  })

  it('renders Performance Dashboard at route "/metrics"', () => {
    renderAtRoute('/metrics')
    expect(screen.getByTestId('perf-dashboard')).toBeInTheDocument()
    expect(screen.getByText('Performance Metrics Dashboard')).toBeInTheDocument()
  })

  it('renders Sign In Page at route "/sign-in" when not authenticated', () => {
    localStorage.clear() // Simulate unauthenticated state
    renderAtRoute('/sign-in')
    expect(screen.getByTestId('signin-page')).toBeInTheDocument()
    expect(screen.getByText('Sign In to VYNL')).toBeInTheDocument()
  })
})
