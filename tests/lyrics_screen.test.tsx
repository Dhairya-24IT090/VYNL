import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LyricsScreen } from '../src/components/LyricsScreen'
import { BackdropProvider } from '../src/context/BackdropContext'
import { PlayerProvider, usePlayer } from '../src/context/PlayerContext'
import type { Track } from '../src/types'

const testTrack: Track = {
  id: 'track-mobile-1',
  title: 'Cyber Highway',
  artist: 'Retrowave Collective',
  duration_seconds: 150,
  audio_url: 'https://cdn.vynl.app/stream/highway.mp3',
  lyrics: `[00:00.00] Speeding down the grid at night
[00:15.00] Digital horizon burning bright
[00:30.00] Never turning back again`,
}

const LyricsScreenHarness = () => {
  const { progress } = usePlayer()

  return (
    <div>
      <span data-testid="player-current-time">{progress}</span>
      <LyricsScreen overrideTrack={testTrack} />
    </div>
  )
}

describe('Task 30 [F14-4]: Fullscreen lyrics screen on desktop and phone', () => {
  it('renders synchronized lyrics screen and allows interactive seeking on click/tap', async () => {
    const user = userEvent.setup()

    render(
      <BackdropProvider>
        <PlayerProvider>
          <LyricsScreenHarness />
        </PlayerProvider>
      </BackdropProvider>
    )

    expect(screen.getByTestId('lyrics-screen')).toBeInTheDocument()
    expect(screen.getByTestId('lyrics-track-title')).toHaveTextContent('Cyber Highway')
    expect(screen.getByTestId('lyrics-track-artist')).toHaveTextContent('Retrowave Collective')

    // Verify all 3 lyric lines are rendered
    expect(screen.getByTestId('lyric-line-line-0')).toHaveTextContent('Speeding down the grid at night')
    expect(screen.getByTestId('lyric-line-line-1')).toHaveTextContent('Digital horizon burning bright')
    expect(screen.getByTestId('lyric-line-line-2')).toHaveTextContent('Never turning back again')

    // Tap second lyric line (timestamp 15.00s)
    const line1 = screen.getByTestId('lyric-line-line-1')
    await user.click(line1)

    // Player progress seeks to 15s
    expect(screen.getByTestId('player-current-time')).toHaveTextContent('15')
  })

  it('handles empty state when track has no lyrics', () => {
    const noLyricsTrack: Track = {
      id: 'track-no-lyrics',
      title: 'Instrumental Ambient',
      artist: 'Silent Sea',
      duration_seconds: 100,
      audio_url: 'https://cdn.vynl.app/stream/sea.mp3',
    }

    render(
      <BackdropProvider>
        <PlayerProvider>
          <LyricsScreen overrideTrack={noLyricsTrack} />
        </PlayerProvider>
      </BackdropProvider>
    )

    expect(screen.getByText('No synchronized lyrics available for this track.')).toBeInTheDocument()
  })
})
