import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlaylistUI } from '../src/components/PlaylistUI'
import { PlayerProvider } from '../src/context/PlayerContext'
import type { Playlist } from '../src/types'

const mockPlaylist: Playlist = {
  id: 'pl-test-1',
  title: 'Synth Explorations',
  is_collaborative: false,
  collaborators: [],
  version: 3,
  items: [
    {
      id: 'item-1',
      playlist_id: 'pl-test-1',
      song_id: 'track-1',
      position: 'a0',
      added_by: 'user-1',
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

describe('Task 17 [F10-6]: Playlist UI and Optimistic Concurrency Recovery', () => {
  it('updates playlist title successfully when no concurrency conflict exists', async () => {
    const user = userEvent.setup()

    render(
      <PlayerProvider>
        <PlaylistUI initialPlaylist={mockPlaylist} />
      </PlayerProvider>
    )

    expect(screen.getByTestId('playlist-title')).toHaveTextContent('Synth Explorations')

    // Click edit
    const editBtn = screen.getByTestId('edit-title-trigger')
    await user.click(editBtn)

    const input = screen.getByTestId('edit-title-input')
    await user.clear(input)
    await user.type(input, 'Cyberpunk Synthwave')

    const saveBtn = screen.getByTestId('save-title-button')
    await user.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByTestId('playlist-title')).toHaveTextContent('Cyberpunk Synthwave')
    })
    expect(screen.queryByTestId('conflict-alert')).not.toBeInTheDocument()
  })

  it('detects stale edit (412 Precondition Failed), displays clear conflict notification, and recovers without data loss', async () => {
    const user = userEvent.setup()

    // Mock handler simulating 412 version conflict from server
    const mockSaveWithConflict = vi.fn().mockImplementation(async (_id, _title, _expectedVersion) => {
      const error: any = new Error('HTTP 412 Precondition Failed: Stale version')
      error.status = 412
      error.serverVersion = 5
      throw error
    })

    render(
      <PlayerProvider>
        <PlaylistUI initialPlaylist={mockPlaylist} onSaveMetadata={mockSaveWithConflict} />
      </PlayerProvider>
    )

    // Start title edit
    await user.click(screen.getByTestId('edit-title-trigger'))
    const input = screen.getByTestId('edit-title-input')
    await user.clear(input)
    await user.type(input, 'Conflicting New Title')

    // Save triggers 412 conflict
    await user.click(screen.getByTestId('save-title-button'))

    // 1. Conflict banner displayed with clear message
    await waitFor(() => {
      expect(screen.getByTestId('conflict-alert')).toBeInTheDocument()
    })
    expect(
      screen.getByText(/Version conflict detected: Another participant updated this playlist/i)
    ).toBeInTheDocument()

    // 2. Playlist tracks are preserved without data loss
    expect(screen.getByTestId('playlist-item-item-1')).toBeInTheDocument()
    expect(screen.getByText('Midnight Reverie')).toBeInTheDocument()

    // 3. User can dismiss and adopt fresh server version
    const resolveBtn = screen.getByTestId('resolve-conflict-button')
    await user.click(resolveBtn)

    await waitFor(() => {
      expect(screen.queryByTestId('conflict-alert')).not.toBeInTheDocument()
    })
    // Fresh version badge is updated
    expect(screen.getByTestId('playlist-version-badge')).toHaveTextContent('Version #5')
  })
})
