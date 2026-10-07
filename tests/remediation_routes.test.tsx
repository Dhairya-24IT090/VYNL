import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppContent } from '../src/App'
import { AuthProvider } from '../src/context/AuthContext'
import { PlayerProvider } from '../src/context/PlayerContext'
import { BackdropProvider } from '../src/context/BackdropContext'

describe('F18-3 remediation route regression', () => {
  it('reaches settings and playlist detail from application navigation', async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/v1/auth/me') return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ user_id: 'u', display_name: 'User' }) } as any
      return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ id: 'p', title: 'Live', owner_id: 'u', version: 1, is_collaborative: false, items: [], collaborators: [] }) } as any
    }) as any
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
    await screen.findByText('Session Active')
    await userEvent.click(screen.getByTestId('nav-link-settings'))
    expect(screen.getByTestId('settings-page')).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('nav-link-playlists'))
    await userEvent.click(await screen.findByText('Open live playlist'))
    expect(await screen.findByTestId('playlist-detail')).toBeInTheDocument()
    expect(await screen.findByTestId('playlist-title')).toHaveTextContent('Live')
  })
})
