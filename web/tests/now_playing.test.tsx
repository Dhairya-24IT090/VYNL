import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NowPlayingBar } from '../src/components/NowPlayingBar'
import { PlayerProvider, usePlayer } from '../src/context/PlayerContext'
import type { Track } from '../src/types'

const TestEnrichmentHarness = () => {
  const { playTrack } = usePlayer()

  const minimalTrack: Track = {
    id: 'track-minimal',
    title: 'Sparse Beat',
    duration_seconds: 120,
    audio_url: 'https://cdn.vynl.app/sample.mp3',
    // album and cover_url omitted, artist omitted
  }

  const enrichedTrack: Track = {
    id: 'track-minimal',
    title: 'Sparse Beat (Deluxe Remaster)',
    artist: 'Master Producer',
    album: 'Neon Horizon',
    duration_seconds: 120,
    audio_url: 'https://cdn.vynl.app/sample.mp3',
    cover_url: 'https://cdn.vynl.app/artwork/neon.jpg',
  }

  return (
    <div>
      <NowPlayingBar />
      <button
        data-testid="load-minimal-btn"
        onClick={() => playTrack(minimalTrack)}
      >
        Load Minimal
      </button>
      <button
        data-testid="enrich-track-btn"
        onClick={() => playTrack(enrichedTrack)}
      >
        Enrich Metadata
      </button>
    </div>
  )
}

describe('Task 6 [F5-7]: Now-playing metadata panel', () => {
  it('renders gracefully when track has missing fields, and updates after metadata enrichment', async () => {
    render(
      <MemoryRouter>
        <PlayerProvider>
          <TestEnrichmentHarness />
        </PlayerProvider>
      </MemoryRouter>
    )

    // Initial state before playing
    expect(screen.getByTestId('now-playing-title')).toHaveTextContent('No Track Selected')

    // Load track with missing metadata fields (no album, no cover, no artist)
    act(() => {
      screen.getByTestId('load-minimal-btn').click()
    })

    // Gracefully handles missing fields
    expect(screen.getByTestId('now-playing-title')).toHaveTextContent('Sparse Beat')
    expect(screen.getByTestId('now-playing-artist')).toHaveTextContent('Unknown Artist')
    expect(screen.getByText('No Art')).toBeInTheDocument()

    // Now enrich the track with full album, artist, and cover
    act(() => {
      screen.getByTestId('enrich-track-btn').click()
    })

    // Metadata panel updates immediately
    expect(screen.getByTestId('now-playing-title')).toHaveTextContent('Sparse Beat (Deluxe Remaster)')
    expect(screen.getByTestId('now-playing-artist')).toHaveTextContent('Master Producer • Neon Horizon')
    expect(screen.queryByText('No Art')).not.toBeInTheDocument()
    const img = screen.getByRole('img', { name: 'Sparse Beat (Deluxe Remaster)' })
    expect(img).toHaveAttribute('src', 'https://cdn.vynl.app/artwork/neon.jpg')
  })
})
