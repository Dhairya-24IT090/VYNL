export interface Track {
  id: string
  title: string
  artist: string
  album?: string
  duration_seconds: number
  audio_url: string
  cover_url?: string
  lyrics?: string
  is_liked?: boolean
  likes_count?: number
  genre?: string
}

export interface SearchResult {
  title: string
  artist: string
  apple_track_id: number
  apple_music_url: string
  duration_ms: number
  artwork_url: string
}

export interface PlaylistItem {
  id: string
  playlist_id: string
  song_id: string
  position: string
  added_by: string
  track?: Track
}

export interface PlaylistCollaborator {
  user_id: string
  role: 'owner' | 'editor' | 'viewer'
  added_at?: string
}

export interface Playlist {
  id: string
  title: string
  description?: string
  is_collaborative: boolean
  owner_id: string
  version: number
  items: PlaylistItem[]
  collaborators: PlaylistCollaborator[]
}

export interface LyricLine {
  id: string
  time_seconds: number
  text: string
}

export interface Backdrop {
  id: string
  name: string
  type: 'preset' | 'custom'
  background: string
  textColor?: string
}

export interface MonthlyWrapData {
  period: string
  total_minutes_listened: number
  unique_tracks_played: number
  top_artists: Array<{ artist: string; play_count: number; minutes: number }>
  top_tracks: Array<{ id: string; title: string; artist: string; play_count: number }>
  longest_streak_days: number
  discovery_rate_percentage: number
  is_final: boolean
}

export interface WizardSeed {
  genres: string[]
  mood: string
  energy: number
  trackCount: number
}

export interface ActivityEvent {
  event_type: 'play' | 'pause' | 'skip' | 'seek' | 'like' | 'recommendation_click'
  track_id: string
  timestamp: number
  context?: string
}

export interface AuthUser {
  user_id: string
  username: string
  avatar_url?: string
  is_authenticated: boolean
}
