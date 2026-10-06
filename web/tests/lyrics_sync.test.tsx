import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { LyricsScreen, parseLrc } from '../src/components/LyricsScreen'
import { PlayerProvider, usePlayer } from '../src/context/PlayerContext'
import { BackdropProvider } from '../src/context/BackdropContext'
import type { Track } from '../src/types'

const trackWithLyrics: Track = {
  id: 'track-lyrics-1',
  title: 'Midnight Reverie',
  artist: 'Aura Bloom',
  duration_seconds: 214,
  audio_url: 'https://cdn.vynl.app/stream/track1.mp3',
  lyrics: `[00:00.00] In the shadows of the neon light
[00:08.50] Whispers drift into the silent night
[00:18.00] Echoes of a rhythm we once knew
[00:27.50] Painting skies in shades of violet blue
[00:36.00] Lost between the pulse and memory`,
}

const LyricsSyncTestHarness = () => {
  const { seek, playTrack } = usePlayer()

  return (
    <div>
      <LyricsScreen overrideTrack={trackWithLyrics} />
      <button
        data-testid="start-playback-btn"
        onClick={() => playTrack(trackWithLyrics)}
      >
        Start
      </button>
      <button data-testid="seek-to-8s" onClick={() => seek(9)}>
        Seek to 9s
      </button>
      <button data-testid="seek-to-28s" onClick={() => seek(28)}>
        Seek to 28s
      </button>
    </div>
  )
}

describe('Task 27 [F13-3]: Client lyric sync and seek highlighting', () => {
  it('correctly parses LRC timestamp formatting', () => {
    const parsed = parseLrc(trackWithLyrics.lyrics)
    expect(parsed.length).toBe(5)
    expect(parsed[0].time_seconds).toBe(0)
    expect(parsed[0].text).toBe('In the shadows of the neon light')
    expect(parsed[1].time_seconds).toBe(8.5)
    expect(parsed[1].text).toBe('Whispers drift into the silent night')
  })

  it('updates the highlighted lyric line instantly upon audio seeking (<50ms)', () => {
    render(
      <BackdropProvider>
        <PlayerProvider>
          <LyricsSyncTestHarness />
        </PlayerProvider>
      </BackdropProvider>
    )

    // Initial state: seek to 9s (should highlight line-1 at 8.5s)
    const t0 = performance.now()
    act(() => {
      screen.getByTestId('seek-to-8s').click()
    })
    const t1 = performance.now()
    expect(t1 - t0).toBeLessThan(50) // Sub-50ms seek processing budget

    const line1 = screen.getByTestId('lyric-line-line-1')
    expect(line1).toHaveStyle({ opacity: '1' })
    expect(line1).toHaveTextContent('Whispers drift into the silent night')

    const line0 = screen.getByTestId('lyric-line-line-0')
    expect(line0).toHaveStyle({ opacity: '0.4' })

    // Seek forward to 28s (should highlight line-3 at 27.5s)
    act(() => {
      screen.getByTestId('seek-to-28s').click()
    })

    const line3 = screen.getByTestId('lyric-line-line-3')
    expect(line3).toHaveStyle({ opacity: '1' })
    expect(line3).toHaveTextContent('Painting skies in shades of violet blue')
    expect(screen.getByTestId('lyric-line-line-1')).toHaveStyle({ opacity: '0.4' })
  })
})
