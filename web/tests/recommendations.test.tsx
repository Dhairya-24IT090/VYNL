import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecommendationUI } from '../src/components/RecommendationUI'
import { PlayerProvider } from '../src/context/PlayerContext'
import { eventBuffer } from '../src/services/eventBuffer'
import type { Track } from '../src/types'

const mockRecs: Track[] = [
  {
    id: 'rec-track-1',
    title: 'Neon Skyline',
    artist: 'Vapor Dream',
    duration_seconds: 195,
    audio_url: 'https://cdn.vynl.app/neon.mp3',
  },
  {
    id: 'rec-track-2',
    title: 'Digital Rain',
    artist: 'Cyber Synth',
    duration_seconds: 220,
    audio_url: 'https://cdn.vynl.app/rain.mp3',
  },
]

describe('Task 8 [F7-11]: Recommendation UI and activity telemetry', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders recommended cards and records click interactions into activity telemetry data', async () => {
    const user = userEvent.setup()

    render(
      <PlayerProvider>
        <RecommendationUI tracks={mockRecs} title="Personalized Discovery" />
      </PlayerProvider>
    )

    expect(screen.getByText('Personalized Discovery')).toBeInTheDocument()
    const card = screen.getByTestId('rec-card-rec-track-1')
    expect(card).toBeInTheDocument()

    // Click recommendation card
    await user.click(card)

    // Verify interaction appears in activity data buffer
    const pendingEvents = eventBuffer.getPendingEvents()
    const recEvent = pendingEvents.find(
      (e) => e.track_id === 'rec-track-1' && e.event_type === 'recommendation_click'
    )

    expect(recEvent).toBeDefined()
    expect(recEvent?.context).toBe('recommendations_feed')
    expect(recEvent?.timestamp).toBeGreaterThan(0)

    // Also verify persistence in localStorage
    const stored = JSON.parse(localStorage.getItem('vynl_event_buffer') || '[]')
    const storedRec = stored.find(
      (e: any) => e.track_id === 'rec-track-1' && e.event_type === 'recommendation_click'
    )
    expect(storedRec).toBeDefined()
  })
})
