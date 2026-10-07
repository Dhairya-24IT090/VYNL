import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppContent } from '../src/App'
import { AuthProvider } from '../src/context/AuthContext'
import { PlayerProvider } from '../src/context/PlayerContext'
import { BackdropProvider } from '../src/context/BackdropContext'
import { SAMPLE_TRACKS } from '../src/data/mockData'

describe('Task 39 [F18-2]: Player and Queue UI persistence across routes', () => {
  beforeEach(() => {
    localStorage.clear()
    const validUser = { user_id: 'user-persist', username: 'PersistUser', is_authenticated: true }
    localStorage.setItem('vynl_user', JSON.stringify(validUser))
    localStorage.setItem('vynl_session_expiry', (Date.now() + 1000000).toString())
    vi.clearAllMocks()
  })

  it('maintains continuous playback and queue state across route changes', async () => {
    render(
      <AuthProvider>
        <PlayerProvider>
          <BackdropProvider>
            <MemoryRouter initialEntries={['/']}>
              <AppContent />
            </MemoryRouter>
          </BackdropProvider>
        </PlayerProvider>
      </AuthProvider>
    )

    // Initially no track selected
    expect(screen.getByTestId('now-playing-title')).toHaveTextContent('No Track Selected')

    // Click play on a recommended track on the discover page
    const firstRecPlay = screen.getByTestId(`rec-card-${SAMPLE_TRACKS[0].id}`)
    act(() => {
      firstRecPlay.click()
    })

    // Now playing updates
    expect(screen.getByTestId('now-playing-title')).toHaveTextContent(SAMPLE_TRACKS[0].title)

    // Navigate to /wizard via navigation sidebar link
    const wizardNavLink = screen.getByTestId('nav-link-wizard')
    act(() => {
      wizardNavLink.click()
    })

    // Heading for Wizard page appears
    expect(screen.getByText('AI Playlist Generator')).toBeInTheDocument()

    // But now-playing track is STILL active and playing!
    expect(screen.getByTestId('now-playing-title')).toHaveTextContent(SAMPLE_TRACKS[0].title)

    // Navigate to /metrics
    const metricsNavLink = screen.getByTestId('nav-link-metrics')
    act(() => {
      metricsNavLink.click()
    })

    // Metrics dashboard appears
    expect(screen.getByText('Performance Metrics Dashboard')).toBeInTheDocument()

    // And now-playing track persists uninterrupted
    expect(screen.getByTestId('now-playing-title')).toHaveTextContent(SAMPLE_TRACKS[0].title)
  })
})
