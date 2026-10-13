# Changelog — VYNL Frontend

All notable changes to the VYNL web client are documented in this file in reverse-chronological order.

---

## [2026-10-14 00:58]

### [Category: Dev] — Playlist Enhancements: Swoosh Auto-Close, Add Songs Action & 5-Song Sliding Recommendations
What changed:
- Updated `AddToPlaylistModal.jsx` with an animated swoosh exit transition and automatic closure (~600ms) upon adding a song to a playlist.
- Added an "Add Songs" button in `PlaylistDetailPage.jsx` header opening an expandable search drawer with debounced iTunes/catalog searching and quick `+` additions.
- Added a 5-song sliding recommendation window at the bottom of `PlaylistDetailPage.jsx` featuring:
  - Refresh button to cycle recommendation tracks.
  - Single `+` button on each song to immediately add it to the playlist.
  - Auto-refill mechanism that immediately pulls the next candidate song into the 5th spot when a song is added, keeping exactly 5 songs in the window.
- Added automated Vitest tests in `tests/playlist_enhancements.test.tsx` (all passing).

Why:
- Delivers animated visual feedback and rapid playlist curation directly from playlist views.

### [Category: UI] — Animated Modal Exit & Recommendation Shelf UX
What changed:
- Added swoosh blur, scale, and translate animation to `AddToPlaylistModal.jsx`.
- Built sleek 5-song recommendation shelf at the bottom of `PlaylistDetailPage.jsx` with instant replacement transitions.

Why:
- Fulfills user specifications for seamless playlist building and dynamic recommendation exploration.

---

## [2026-10-14 00:36]

### [Category: Dev] — Verified End-to-End Lyrics Stream & Playback Sync
What changed:
- Verified lyrics retrieval against live audio tracks with composite titles (e.g., "Die For You - The Weeknd -").
- Confirmed synchronized line progression, auto-scroll centering, and glow rendering as playback advances.

Why:
- Ensure seamless end-to-end user experience for all tracks across both authenticated and guest playback sessions.

---

## [2026-10-14 00:25]

### [Category: Dev] — Synced & Customizable Lyrics Client Implementation
What changed:
- Created autodiscovered background images config `src/config/lyricsBackgrounds.js` scanning `src/assets/lyrics-backgrounds/` via Vite's `import.meta.glob`.
- Created Google Fonts config `src/config/lyricsFonts.js` featuring 30 fonts across 6 categories with on-demand stylesheet injection.
- Implemented LRC parser, plain lyrics character-weighted estimation, and binary search active-line finder in `src/utils/lrc.js`.
- Implemented pure Latin-script English language validation in `src/utils/lyricsLanguage.js`.
- Implemented `useLyrics` (caching, abort controller) and `useLyricsStyle` (`vynl.lyricsStyle.v1` in `localStorage` with validation and clamping).
- Added `currentTime` and `getAudioCurrentTime` non-blocking getter to `PlayerContext.jsx`.
- Created `LyricsPanel.jsx` sliding glassmorphic drawer and fullscreen viewer with auto-scroll, 3s manual scroll pause, jump to line button, active line glow, and click-to-seek.
- Created `LyricsCustomizer.jsx` with Background, 30 Font live previews, and Effects tabs.
- Added `LyricsScreen.jsx` compatibility adapter and re-export for testing harnesses.
- Added interactive lyrics toggle button (`data-testid="lyrics-toggle-btn"`) to `NowPlayingBar.jsx` and mounted `LyricsPanel` in `App.jsx`.
- Added unit tests in `tests/lyrics_engine.test.ts` (19 passing tests).
- Verified production build succeeds in <300ms.

Why:
- Adds interactive, real-time synchronized and customizable lyrics viewing directly in the VYNL web player.

### [Category: UI] — Lyrics Drawer, Fullscreen Mode & Live Customizer
What changed:
- Implemented sliding glassmorphic lyrics panel responsive down to mobile viewports (375px).
- Added fullscreen expansion overlay with `Esc` key handling.
- Added layered dynamic text-shadow glow effect and dark overlay control.
- Verified in-browser end-to-end functionality including panel toggle, customizer interaction, fullscreen mode, playback tracking, and localStorage persistence.

Why:
- Delivers a visually rich, responsive user experience adhering to the VYNL glassmorphism aesthetic.

---

## [2026-10-14 00:05]

### [Category: Dev] — Context & Documentation Harmonization
What changed:
- Updated `Context.md` with full frontend component map, playlist routing, queue controller details, and key conventions.
Why:
- Ensure standalone documentation integrity within the frontend repository per repository standards.

---

## [2026-10-13 23:59]

### [Category: Dev] — Playlist Visibility, Search Result Ingestion & Shuffle Implementation
What changed:
- Fixed frontend response parsing in `PlaylistsPage.jsx` and `AddToPlaylistModal.jsx` to defensively handle `{ playlists: [...] }` objects from `/v1/playlists/`.
- Updated `PlayerContext.jsx` to dynamically resolve audio stream URLs (`/api/v1/tracks/${trackId}/stream-link`) when missing on queued tracks, and introduced the `playPlaylist(tracks, { shuffle, startIndex })` method implementing the Fisher-Yates shuffle algorithm.
- Enhanced `AddToPlaylistModal.jsx` to automatically resolve and ingest search results (`/api/v1/tracks/ingest`) before adding them to a playlist so that valid `track_id`s and metadata are attached.
- Verified test suite passes: Vite production build succeeding in 375ms with 0 errors.

Why:
- Fixes the bug where created playlists did not appear in the UI, enables adding tracks directly from search results to playlists, and implements the playlist shuffle playback feature.

Bug fixed (if applicable):
- Playlists created by the user were not displaying in `PlaylistsPage.jsx` and `AddToPlaylistModal.jsx` ("You haven't created any playlists yet" was permanently displayed).
- Search results lacked an "Add to Playlist" action.
- Playlists lacked a feature to shuffle and play random tracks from the playlist.

Root cause (if applicable):
- `PlaylistsPage.jsx` and `AddToPlaylistModal.jsx` evaluated `Array.isArray(data)` on the response of `GET /v1/playlists/`. Because the backend returns `{ "playlists": [...] }`, `Array.isArray` returned `false`, resetting the state to `[]` on every fetch and re-render.
- Search result items in `SearchUI.jsx` only rendered Play and Queue buttons without an `AddToPlaylistModal` hook or track resolution.
- Playlist detail only triggered single-track playback on `tracks[0]` without queue randomizing or shuffle controls.

### [Category: UI] — Search Result Playlist Controls & Shuffle UX
What changed:
- Added a dedicated "Add to Playlist" button with `<ListPlus size={14} />` icon to every search result row in `SearchUI.jsx`.
- Added a prominent "Shuffle" button with `<Shuffle size={16} />` icon alongside "Play All" in `PlaylistDetailPage.jsx`.
- Added quick action buttons ("Play" and "Shuffle") to each playlist card in `PlaylistsPage.jsx` grid.
- Added loading spinners, error banners, and success confirmation badges ("Added") with checkmarks in `AddToPlaylistModal.jsx` and `PlaylistsPage.jsx`.
- Verified end-to-end functionality via automated browser automation, capturing the complete playlist creation, search add, and shuffle playback workflow.
Why:
- Delivers an intuitive, premium music streaming UX matching modern web standards and fulfilling all user specifications.
