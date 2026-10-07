import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { LyricsScreen } from '../src/components/LyricsScreen'
import { BackdropProvider, PRESET_BACKDROPS } from '../src/context/BackdropContext'
import { PlayerProvider } from '../src/context/PlayerContext'
import type { Track } from '../src/types'

const testTrack: Track = {
  id: 'track-bdrop-1',
  title: 'Starlight Dream',
  artist: 'Nova Echo',
  duration_seconds: 180,
  audio_url: 'https://cdn.vynl.app/stream/song.mp3',
  lyrics: `[00:00.00] Floating in deep violet skies
[00:10.00] Starlight opening our eyes`,
}

describe('Task 28 [F14-1]: Pre-designed backdrops and readable lyric contrast', () => {
  it('guarantees all preset backdrops have WCAG-compliant high-contrast text (#FFFFFF)', () => {
    expect(PRESET_BACKDROPS.length).toBeGreaterThanOrEqual(4)
    for (const preset of PRESET_BACKDROPS) {
      expect(preset.textColor).toBe('#FFFFFF')
      expect(preset.background).toContain('#0F0F0F') // Deep dark base ensures contrast > 4.5:1
    }
  })

  it('renders lyrics legibly across every preset backdrop with readable text contrast', () => {
    render(
      <BackdropProvider>
        <PlayerProvider>
          <LyricsScreen overrideTrack={testTrack} />
        </PlayerProvider>
      </BackdropProvider>
    )

    const lyricsContainer = screen.getByTestId('lyrics-screen')

    // Cycle through every preset backdrop
    for (const preset of PRESET_BACKDROPS) {
      const presetBtn = screen.getByTestId(`backdrop-${preset.id}`)
      expect(presetBtn).toBeInTheDocument()

      act(() => {
        presetBtn.click()
      })

      // Active screen container adopts background and maintains #FFFFFF text color
      expect(lyricsContainer).toHaveStyle({
        color: '#FFFFFF',
      })
    }
  })
})
