# Project Context — VYNL Frontend Client

Handoff reference and living documentation for the VYNL React + Vite web client.

---

## 1. Project Overview & Architecture

VYNL Frontend is a high-performance, dark-themed music streaming client built with React 19 and Vite. It provides seamless continuous audio playback, search-to-stream capabilities, queue management, recommendation discovery, and playlist curation.

### Directory Structure

```
VYNL/
├── src/
│   ├── components/
│   │   ├── AddToPlaylistModal.jsx  # Modal for adding songs to playlists with automatic track ingest
│   │   ├── LyricsCustomizer.jsx    # Popover for backgrounds, 30 Google fonts, colors, and glow
│   │   ├── LyricsPanel.jsx         # Sliding side panel and fullscreen synchronized lyrics viewer
│   │   ├── LyricsScreen.jsx        # Compatibility adapter for synchronized lyrics testing
│   │   ├── Navigation.jsx          # Sidebar navigation with active state indicators
│   │   ├── NowPlayingBar.jsx       # Floating bottom audio player with scrubber & controls
│   │   ├── QueueDrawer.jsx         # Collapsible sliding queue drawer
│   │   ├── SearchUI.jsx            # Live iTunes search with Ingest, Play, Queue & Add-to-Playlist
│   │   └── TrackCard.jsx           # Grid track card with hover actions, like, radio, & playlist options
│   ├── config/
│   │   ├── lyricsBackgrounds.js    # Vite glob import autodiscovering assets/lyrics-backgrounds/
│   │   └── lyricsFonts.js          # Curated 30 Google Fonts catalogue across 6 categories
│   ├── context/
│   │   ├── AuthContext.jsx         # Session state, user profile, login & logout handlers
│   │   ├── BackdropContext.jsx     # Dynamic UI backdrop colors extracted from album art
│   │   └── PlayerContext.jsx       # Audio element controller, persistent queue, and playlist shuffle
│   ├── hooks/
│   │   ├── useLyrics.js            # LRCLIB proxy client with session cache and abort controller
│   │   └── useLyricsStyle.js       # LocalStorage persistent styles (vynl.lyricsStyle.v1)
│   ├── pages/
│   │   ├── DiscoverPage.jsx        # Discovery page housing the SearchUI
│   │   ├── HomePage.jsx            # Personalized recommendation feed & quick start tracks
│   │   ├── LibraryPage.jsx         # Saved/liked tracks
│   │   ├── LoginPage.jsx           # Sign-in screen with OAuth triggers
│   │   ├── OnboardingPage.jsx      # Genre & artist onboarding taste quiz
│   │   ├── PlaylistDetailPage.jsx  # Playlist tracklist with Play All & Shuffle controls
│   │   └── PlaylistsPage.jsx       # User playlists gallery with creation form & card quick actions
│   ├── services/
│   │   ├── apiClient.js            # W3C traceparent, CSRF token injection & HTTP helpers
│   │   └── eventBuffer.js          # Batched telemetry buffer sending plays/skips every 5s
│   ├── utils/
│   │   ├── lrc.js                  # LRC parsing, plain lyrics estimation, binary search seeker
│   │   └── lyricsLanguage.js       # Latin-script language filter (>15% non-Latin rejected)
│   ├── assets/
│   │   └── lyrics-backgrounds/     # User-drop custom wallpapers with auto-discovery
│   ├── App.jsx                     # Layout shell & React Router route definitions
│   ├── index.css                   # Core tokens, glassmorphism utilities & theme variables
│   └── main.jsx                    # Application entry point
├── tests/                          # Vitest & React Testing Library test suite
├── package.json
└── vite.config.js                  # Proxies /v1 -> 8001 (Backend) & /api, /stream -> 8000 (Streaming)
```

---

## 2. Implemented Features & Workflows

### Synchronized & Customizable Lyrics
- **LRCLIB Integration**: Fetches time-coded or plain lyrics via backend proxy `/v1/lyrics`.
- **English-Only Filter**: Pure `isEnglishLyrics` function ensures only Latin-script lyrics are shown (treats >15% non-Latin as empty).
- **Time-Coded Synchronization & Fallback**:
  - Synced lyrics parser parses `[mm:ss.xx]`, multiple timestamps, offsets, and filters metadata tags.
  - Plain lyrics fallback estimates line timestamps using character-length weighting (~8% intro lead-in, ~5% outro) marked with "Estimated sync".
  - Binary search active-line seeker synchronizes lines to playback via requestAnimationFrame without triggering component tree re-renders.
  - Interactive click-to-seek on synced lines.
- **Glassmorphic UI & Fullscreen Overlay**:
  - Right-side sliding panel coexisting with `QueueDrawer.jsx` and responsive down to mobile viewports (375px).
  - Smooth autoscroll centering active line with 3-second manual scroll pause and "Jump to current line" button.
  - Fullscreen expansion toggle with `Esc` exit.
- **Dynamic Live Customizer**:
  - Autodiscovered background wallpapers from `src/assets/lyrics-backgrounds/` with lazy loading.
  - 30 curated Google Fonts across 6 categories (Handwritten, Horror/metal, Retro/pixel, Display/neon, Elegant/editorial, Typewriter) with live "Feel the rhythm" previews.
  - Text color picker + 8 color swatches.
  - Glow slider (0-100) controlling layered dynamic `text-shadow`.
  - Dark background overlay slider (0-100).
  - LocalStorage persistence under key `vynl.lyricsStyle.v1` with validation, clamping, and reset.

### Playlists
- **Multiple Custom Playlists**: Unlimited playlists can be created via `PlaylistsPage.jsx` or inline within `AddToPlaylistModal.jsx`.
- **Swoosh Modal & Auto-Close**: `AddToPlaylistModal.jsx` provides an animated swoosh exit transition and automatically closes upon track addition.
- **Add Songs Action**: `PlaylistDetailPage.jsx` includes an "Add Songs" button in the header toggling an expandable search drawer with live debounced search and single-click additions.
- **5-Song Sliding Recommendation Window**: Located at the bottom of each playlist view, featuring a Refresh button, single `+` buttons for 1-click addition, and automatic refill from candidate pool upon song addition.
- **Defensive API Ingestion**: Safely unwraps `{ playlists: [...] }` from `/v1/playlists/` avoiding state wipeouts.
- **Card Quick Actions**: Play and Shuffle buttons directly on each playlist card in the gallery grid.
- **Detail View & True Shuffle**:
  - `PlaylistDetailPage.jsx` includes both "Play All" (sequential) and "Shuffle" (Fisher-Yates randomized queue).
  - Individual track row clicking starts playback from that index while enqueuing the remainder of the playlist.
- **Search Result Integration**: Every track returned from `SearchUI.jsx` exposes an "Add to Playlist" action that automatically ingests the track if unindexed before linking to the playlist.

### Audio Player & Queue
- Persistent global HTML5 audio player managed in `PlayerContext.jsx`.
- Dynamic on-the-fly stream link resolution (`/api/v1/tracks/${trackId}/stream-link`) when songs queued without URLs begin playing.
- Background telemetry flushes via `eventBuffer.js`.

---

## 3. Key Conventions & Styling

- **Glassmorphism**: Standard classes `.glass-panel`, `.glass-card`, `.btn-glass` with backdrop-filter blur and subtle border highlights.
- **Lyrics Customization**: Settings stored in `localStorage` under `vynl.lyricsStyle.v1`. Custom backgrounds added to `src/assets/lyrics-backgrounds/` are picked up automatically.
- **Icons**: Standardized on `lucide-react` (icons include `Play`, `Shuffle`, `Plus`, `ListPlus`, `Trash2`, `Heart`, `ListMusic`, `Mic2`, `Maximize2`, `Minimize2`, `Palette`).
- **Responsive Breakpoints**: Grid auto-fill layouts adapting from mobile screens (375px) to wide monitors (1440px).
