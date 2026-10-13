import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AddToPlaylistModal } from '../src/components/AddToPlaylistModal';
import { PlaylistDetailPage } from '../src/pages/PlaylistDetailPage';
import { PlayerProvider } from '../src/context/PlayerContext';
import { api } from '../src/services/apiClient';

vi.mock('../src/services/apiClient', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Playlist Enhancements: Swoosh & 5-Song Sliding Window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AddToPlaylistModal: adds track, triggers swoosh and auto-closes dialog', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const mockTrack = {
      id: 'track-1',
      track_id: 'track-1',
      title: 'Daylight',
      artist: 'David Kushner',
    };

    (api.get as any).mockResolvedValueOnce({
      playlists: [
        { playlist_id: 'pl-1', name: 'Dhairya ke gaane', track_count: 1 },
      ],
    });
    (api.post as any).mockResolvedValueOnce({ success: true });

    render(
      <AddToPlaylistModal
        isOpen={true}
        onClose={handleClose}
        track={mockTrack}
      />
    );

    expect(await screen.findByText('Dhairya ke gaane')).toBeInTheDocument();

    const playlistRow = screen.getByText('Dhairya ke gaane');
    await user.click(playlistRow);

    // Verify post was made
    expect(api.post).toHaveBeenCalledWith(
      '/v1/playlists/pl-1/tracks',
      expect.objectContaining({
        track_id: 'track-1',
        title: 'Daylight',
        artist: 'David Kushner',
      })
    );

    // Dialog has swoosh styles applied
    const dialog = screen.getByTestId('add-to-playlist-dialog');
    expect(dialog).toHaveStyle({ opacity: '0' });

    // Auto-close is called after timeout
    await waitFor(() => {
      expect(handleClose).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('PlaylistDetailPage: renders Add Songs button and toggles search panel', async () => {
    const user = userEvent.setup();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/v1/playlists/pl-1')) {
        return Promise.resolve({
          playlist_id: 'pl-1',
          name: 'My Playlist',
          tracks: [{ track_id: 't-1', title: 'Song 1', artist: 'Artist 1' }],
        });
      }
      if (url.includes('/v1/recommendations/trending')) {
        return Promise.resolve({
          trending: [
            { track_id: 'rec-1', title: 'Rec 1', artist: 'Artist A' },
            { track_id: 'rec-2', title: 'Rec 2', artist: 'Artist B' },
            { track_id: 'rec-3', title: 'Rec 3', artist: 'Artist C' },
            { track_id: 'rec-4', title: 'Rec 4', artist: 'Artist D' },
            { track_id: 'rec-5', title: 'Rec 5', artist: 'Artist E' },
            { track_id: 'rec-6', title: 'Rec 6', artist: 'Artist F' },
          ],
        });
      }
      return Promise.resolve([]);
    });

    render(
      <PlayerProvider>
        <MemoryRouter initialEntries={['/playlists/pl-1']}>
          <Routes>
            <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
          </Routes>
        </MemoryRouter>
      </PlayerProvider>
    );

    const addSongsBtn = await screen.findByTestId('add-songs-btn');
    expect(addSongsBtn).toBeInTheDocument();

    // Click Add Songs button to open search panel
    await user.click(addSongsBtn);
    expect(screen.getByTestId('playlist-search-input')).toBeInTheDocument();
  });

  it('PlaylistDetailPage: displays exactly 5 songs in bottom sliding window and auto-refills when added', async () => {
    const user = userEvent.setup();
    const candidateTracks = [
      { track_id: 'rec-1', title: 'Rec 1', artist: 'Artist A' },
      { track_id: 'rec-2', title: 'Rec 2', artist: 'Artist B' },
      { track_id: 'rec-3', title: 'Rec 3', artist: 'Artist C' },
      { track_id: 'rec-4', title: 'Rec 4', artist: 'Artist D' },
      { track_id: 'rec-5', title: 'Rec 5', artist: 'Artist E' },
      { track_id: 'rec-6', title: 'Rec 6', artist: 'Artist F' },
      { track_id: 'rec-7', title: 'Rec 7', artist: 'Artist G' },
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/v1/playlists/pl-1')) {
        return Promise.resolve({
          playlist_id: 'pl-1',
          name: 'My Playlist',
          tracks: [{ track_id: 't-1', title: 'Song 1', artist: 'Artist 1' }],
        });
      }
      if (url.includes('/v1/recommendations/trending')) {
        return Promise.resolve({
          trending: candidateTracks,
        });
      }
      return Promise.resolve([]);
    });
    (api.post as any).mockResolvedValue({ success: true });

    render(
      <PlayerProvider>
        <MemoryRouter initialEntries={['/playlists/pl-1']}>
          <Routes>
            <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
          </Routes>
        </MemoryRouter>
      </PlayerProvider>
    );

    expect(await screen.findByTestId('recommended-sliding-window-section')).toBeInTheDocument();

    // Verify exactly 5 songs rendered in sliding window
    expect(screen.getByTestId('sliding-window-item-0')).toHaveTextContent('Rec 1');
    expect(screen.getByTestId('sliding-window-item-1')).toHaveTextContent('Rec 2');
    expect(screen.getByTestId('sliding-window-item-2')).toHaveTextContent('Rec 3');
    expect(screen.getByTestId('sliding-window-item-3')).toHaveTextContent('Rec 4');
    expect(screen.getByTestId('sliding-window-item-4')).toHaveTextContent('Rec 5');
    expect(screen.queryByTestId('sliding-window-item-5')).toBeNull();

    // Click single + button on the first recommended track (Rec 1)
    const plusBtn = screen.getByTestId('add-recommended-track-rec-1');
    await user.click(plusBtn);

    // Verify it was added to playlist API
    expect(api.post).toHaveBeenCalledWith(
      '/v1/playlists/pl-1/tracks',
      expect.objectContaining({ track_id: 'rec-1', title: 'Rec 1' })
    );

    // Auto-refill: Rec 6 should immediately slide into the 5th spot, keeping exactly 5 items
    await waitFor(() => {
      expect(screen.getByTestId('sliding-window-item-0')).toHaveTextContent('Rec 2');
      expect(screen.getByTestId('sliding-window-item-4')).toHaveTextContent('Rec 6');
    });
  });
});
