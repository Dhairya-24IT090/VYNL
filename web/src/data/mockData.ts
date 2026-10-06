import type { MonthlyWrapData, Playlist, Track } from '../types'

export const SAMPLE_TRACKS: Track[] = [
  {
    id: 'track-1',
    title: 'Midnight Reverie',
    artist: 'Aura Bloom',
    album: 'Synthetic Echoes',
    duration_seconds: 214,
    audio_url: 'https://cdn.vynl.app/sample/track1.mp3',
    cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
    lyrics: `[00:00.00] In the shadows of the neon light
[00:08.50] Whispers drift into the silent night
[00:18.00] Echoes of a rhythm we once knew
[00:27.50] Painting skies in shades of violet blue
[00:36.00] Lost between the pulse and memory
[00:46.00] Drifting through the midnight reverie
[00:58.00] Hold the frequency, don't let it fade
[01:10.00] We are timeless in the sound we made`,
    is_liked: true,
    likes_count: 1420,
    genre: 'Synthwave',
  },
  {
    id: 'track-2',
    title: 'Celestial Drift',
    artist: 'Solaris Wave',
    album: 'Starlight Horizon',
    duration_seconds: 185,
    audio_url: 'https://cdn.vynl.app/sample/track2.mp3',
    cover_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
    lyrics: `[00:00.00] Floating above the atmosphere
[00:10.00] Gravity lets go of every fear
[00:22.00] Signals traveling across the deep
[00:34.00] Secrets that the distant comets keep
[00:48.00] Celestial drift, endless space
[01:02.00] Finding peace in this holy place`,
    is_liked: false,
    likes_count: 856,
    genre: 'Ambient',
  },
  {
    id: 'track-3',
    title: 'Quantum Pulse',
    artist: 'Neon Paradox',
    album: 'Cybernetics',
    duration_seconds: 240,
    audio_url: 'https://cdn.vynl.app/sample/track3.mp3',
    cover_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80',
    lyrics: `[00:00.00] Circuit heartbeat pumping digital blood
[00:12.00] Rising like an electric flood
[00:24.00] Quantum states collide and weave
[00:36.00] In the code that we believe
[00:50.00] Break the firewall, take the leap
[01:04.00] Promises the machines will keep`,
    is_liked: true,
    likes_count: 3210,
    genre: 'Electronic',
  },
  {
    id: 'track-4',
    title: 'Velvet Horizon',
    artist: 'Luna Eclipse',
    album: 'Nocturne Phases',
    duration_seconds: 198,
    audio_url: 'https://cdn.vynl.app/sample/track4.mp3',
    cover_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    is_liked: false,
    likes_count: 672,
    genre: 'Lo-Fi',
  },
]

export const SAMPLE_PLAYLISTS: Playlist[] = [
  {
    id: 'playlist-1',
    title: 'Late Night Focus',
    description: 'Curated atmospheric beats for deep work and midnight coding sessions.',
    is_collaborative: false,
    owner_id: 'user-default',
    version: 4,
    items: [
      {
        id: 'item-1',
        playlist_id: 'playlist-1',
        song_id: 'track-1',
        position: 'a0',
        added_by: 'user-default',
        track: SAMPLE_TRACKS[0],
      },
      {
        id: 'item-2',
        playlist_id: 'playlist-1',
        song_id: 'track-2',
        position: 'a1',
        added_by: 'user-default',
        track: SAMPLE_TRACKS[1],
      },
    ],
    collaborators: [],
  },
  {
    id: 'playlist-2',
    title: 'Studio Collab Session',
    description: 'Real-time collaborative selection with multiple active editors.',
    is_collaborative: true,
    owner_id: 'user-default',
    version: 12,
    items: [
      {
        id: 'item-3',
        playlist_id: 'playlist-2',
        song_id: 'track-3',
        position: 'a0',
        added_by: 'user-default',
        track: SAMPLE_TRACKS[2],
      },
      {
        id: 'item-4',
        playlist_id: 'playlist-2',
        song_id: 'track-4',
        position: 'a1',
        added_by: 'user-editor',
        track: SAMPLE_TRACKS[3],
      },
    ],
    collaborators: [
      { user_id: 'user-default', role: 'owner' },
      { user_id: 'user-editor', role: 'editor' },
      { user_id: 'user-viewer', role: 'viewer' },
    ],
  },
]

export const SAMPLE_WRAP: MonthlyWrapData = {
  period: '2026-09',
  total_minutes_listened: 4320,
  unique_tracks_played: 184,
  top_artists: [
    { artist: 'Aura Bloom', play_count: 94, minutes: 340 },
    { artist: 'Neon Paradox', play_count: 81, minutes: 295 },
    { artist: 'Solaris Wave', play_count: 62, minutes: 210 },
  ],
  top_tracks: [
    { id: 'track-1', title: 'Midnight Reverie', artist: 'Aura Bloom', play_count: 42 },
    { id: 'track-3', title: 'Quantum Pulse', artist: 'Neon Paradox', play_count: 36 },
  ],
  longest_streak_days: 19,
  discovery_rate_percentage: 42.5,
  is_final: true,
}

export const EMPTY_WRAP: MonthlyWrapData = {
  period: '2026-10',
  total_minutes_listened: 0,
  unique_tracks_played: 0,
  top_artists: [],
  top_tracks: [],
  longest_streak_days: 0,
  discovery_rate_percentage: 0.0,
  is_final: false,
}
