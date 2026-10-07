import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { PlayerProvider, usePlayer } from '../src/context/PlayerContext'
import type { Track } from '../src/types'

const testTrack: Track = {
  id: 'track-long-1',
  title: 'Epic Symphony in A Minor',
  artist: 'Orchestral Dream',
  duration_seconds: 600,
  audio_url: 'https://cdn.vynl.app/stream/track-long-1.mp3?token=initial_expiring_soon',
}

const TestPlayerHarness = () => {
  const { currentTrack, isPlaying, playTrack, togglePlay, refreshTrackUrl } = usePlayer()

  return (
    <div>
      <span data-testid="current-track-title">{currentTrack?.title || 'None'}</span>
      <span data-testid="current-track-url">{currentTrack?.audio_url || 'None'}</span>
      <span data-testid="playback-status">{isPlaying ? 'Playing' : 'Paused'}</span>
      <button data-testid="play-btn" onClick={() => playTrack(testTrack)}>
        Play
      </button>
      <button data-testid="toggle-btn" onClick={togglePlay}>
        Toggle
      </button>
      <button
        data-testid="refresh-url-btn"
        onClick={() => refreshTrackUrl(testTrack.id)}
      >
        Refresh Link
      </button>
    </div>
  )
}

describe('Task 4 [F3-18]: Audio Player with seamless link refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts playback of a long track', async () => {
    render(
      <PlayerProvider>
        <TestPlayerHarness />
      </PlayerProvider>
    )

    expect(screen.getByTestId('current-track-title')).toHaveTextContent('None')
    expect(screen.getByTestId('playback-status')).toHaveTextContent('Paused')

    act(() => {
      screen.getByTestId('play-btn').click()
    })

    expect(screen.getByTestId('current-track-title')).toHaveTextContent('Epic Symphony in A Minor')
    expect(screen.getByTestId('current-track-url')).toHaveTextContent('initial_expiring_soon')
  })

  it('refreshes expired presigned URL seamlessly so track keeps playing', async () => {
    render(
      <PlayerProvider>
        <TestPlayerHarness />
      </PlayerProvider>
    )

    // Play initial track
    act(() => {
      screen.getByTestId('play-btn').click()
    })

    const initialUrl = screen.getByTestId('current-track-url').textContent

    // Simulate link expiration refresh
    await act(async () => {
      screen.getByTestId('refresh-url-btn').click()
    })

    const refreshedUrl = screen.getByTestId('current-track-url').textContent
    expect(refreshedUrl).not.toEqual(initialUrl)
    expect(refreshedUrl).toContain('token=refreshed_')
    // Playback state remains uninterrupted
    expect(screen.getByTestId('playback-status')).toHaveTextContent('Playing')
    expect(screen.getByTestId('current-track-title')).toHaveTextContent('Epic Symphony in A Minor')
  })
})
