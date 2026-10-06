import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CollaborationUI } from '../src/components/CollaborationUI'
import type { Playlist } from '../src/types'

const initialCollabPlaylist: Playlist = {
  id: 'pl-collab-1',
  title: 'Late Night Synthesis',
  is_collaborative: true,
  collaborators: [],
  version: 1,
  items: [
    {
      id: 'item-c1',
      playlist_id: 'pl-collab-1',
      song_id: 'track-1',
      position: 'a0',
      added_by: 'Alice',
      track: {
        id: 'track-1',
        title: 'Midnight Reverie',
        artist: 'Aura Bloom',
        duration_seconds: 214,
        audio_url: 'https://cdn.vynl.app/stream/track1.mp3',
      },
    },
  ],
}

describe('Task 26 [F12-4]: Collaboration UI and Real-time Peer Synchronization', () => {
  it('displays active peer presence badges in collaboration room', () => {
    render(
      <CollaborationUI
        playlist={initialCollabPlaylist}
        activePeers={['Alice (Host)', 'Bob (Editor)']}
      />
    )

    expect(screen.getByTestId('collab-container')).toBeInTheDocument()
    expect(screen.getByTestId('peer-badge-0')).toHaveTextContent('Alice (Host)')
    expect(screen.getByTestId('peer-badge-1')).toHaveTextContent('Bob (Editor)')
  })

  it('synchronizes tracks when AI suggestions are broadcasted and accepted by collaborators', async () => {
    const user = userEvent.setup()
    const handleAddTrack = vi.fn()

    render(
      <CollaborationUI
        playlist={initialCollabPlaylist}
        activePeers={['Alice', 'Bob']}
        onAddTrack={handleAddTrack}
      />
    )

    // Suggestion banner is visible
    expect(screen.getByTestId('collab-suggestions-banner')).toBeInTheDocument()
    const acceptBtn = screen.getByTestId('accept-suggestion-sug-1')
    expect(acceptBtn).toBeInTheDocument()

    // Accept suggestion
    await user.click(acceptBtn)

    // Track is incorporated into collaborative playlist list
    await waitFor(() => {
      expect(screen.queryByTestId('collab-suggestions-banner')).not.toBeInTheDocument()
    })
    expect(handleAddTrack).toHaveBeenCalledTimes(1)
    expect(handleAddTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
      })
    )

    // Collab items list now contains the newly added track
    const itemsList = screen.getByTestId('collab-items-list')
    expect(itemsList.children.length).toBe(2)
  })
})
