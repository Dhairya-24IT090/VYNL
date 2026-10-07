import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NowPlayingBar } from '../src/components/NowPlayingBar'
import { Navigation } from '../src/components/Navigation'
import { SearchUI } from '../src/components/SearchUI'
import { DownloadUI } from '../src/components/DownloadUI'
import { PlayerProvider } from '../src/context/PlayerContext'
import { AuthProvider } from '../src/context/AuthContext'
import type { Track } from '../src/types'
import indexCss from '../src/index.css?raw'

const sampleTrack: Track = {
  id: 'track-a11y',
  title: 'Harmonic Flow',
  artist: 'Echoist',
  duration_seconds: 240,
  audio_url: 'https://cdn.vynl.app/stream/harmonic.mp3',
}

describe('Task 42 [F18-5]: Responsiveness and Accessibility Audit', () => {
  it('provides accessible names and ARIA landmarks across primary navigation and transport controls', () => {
    render(
      <AuthProvider>
        <PlayerProvider>
          <MemoryRouter>
            <Navigation />
            <NowPlayingBar />
            <SearchUI />
          </MemoryRouter>
        </PlayerProvider>
      </AuthProvider>
    )

    // Landmarks
    expect(screen.getByRole('complementary', { name: 'Main Navigation' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo', { name: 'Now Playing Bar' })).toBeInTheDocument()

    // Search input accessible name
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument()

    // Transport buttons accessible names
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous Track' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next Track' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mute' })).toBeInTheDocument()
  })

  it('provides accessible labels on media download actions', () => {
    render(
      <PlayerProvider>
        <DownloadUI track={sampleTrack} />
      </PlayerProvider>
    )

    const dlBtn = screen.getByRole('button', { name: 'Download Harmonic Flow' })
    expect(dlBtn).toBeInTheDocument()
  })

  it('implements prefers-reduced-motion media query in CSS tokens for accessibility', () => {
    expect(indexCss).toContain('prefers-reduced-motion: reduce')
    expect(indexCss).toContain('animation-duration: 0.01ms')
  })
})
