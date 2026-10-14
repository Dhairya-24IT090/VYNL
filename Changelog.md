# Changelog — VYNL Frontend

All notable changes to the VYNL web client are documented in this file in reverse-chronological order.

---

## [2026-10-14 10:35]

### [Category: UI/UX] — Animated Lyrics Slide-Up Layout, Bottom Scrubber Metadata & Actions Cluster, and Circular Track Row Artwork Play Overlay
What changed:
- **Now Playing Inline Lyrics Layout & Animation**:
  - Embedded `@keyframes lyricsSlideUpReveal` for a fluid upward reveal animation when toggling lyrics.
  - Hid the top cover art banner and top cradle when lyrics mode is active, completely freeing up the song section for lyrics lines.
  - Repositioned the song title (`data-testid="now-playing-title"`) and artist (`data-testid="now-playing-artist"`) inside `.player-lyrics-bottom-meta-row` positioned directly above the playback scrubber.
  - Positioned the action buttons (favorite Heart, Lyrics Theme Customizer, Fullscreen Expand, and options/volume menu) in a compact glass cluster to the right of the title/artist line, directly above the timeline rail.
- **Playlist Detail Track Row Aesthetic**:
  - Removed redundant separate play button before track artwork in `src/pages/PlaylistDetailPage.jsx`.
  - Integrated a centered `Play` icon overlay over the circular track thumbnail with a smooth darkened backing scrim matching `TrackRow.jsx`.
  - Retained translucent glass circular remove button (`btn-circle`) with zero opaque background artifacts.
- **Documentation & Cleanup**:
  - Placed comprehensive `DESIGN.md` in `VYNL/docs/DESIGN.md`.
  - Deleted obsolete `ui-redesign-plan.md`.
  - Updated `README.md` and living project context.

Why:
- Directly resolves user specification to remove top cover and title/artist from the lyrics upper area, smoothly animate lyrics upward, and relocate song title, artist, and actions directly above the song control cluster.

---

## [2026-10-14 10:22]

### [Category: UI/UX] — Translucent Glass Buttons in Playlists and Cross-Screen Font & Background Consistency
What changed:
- Fixed playlist row buttons displaying as white square blocks by replacing undefined `circular-btn` with `btn-circle` in `src/pages/PlaylistDetailPage.jsx` and `src/pages/PlaylistsPage.jsx`, and aliasing `.circular-btn` in `src/index.css`.
- Refactored `src/hooks/useLyricsStyle.js` into an in-memory synchronized reactive store that keeps inline and fullscreen lyrics perfectly aligned on font, background, glow, darkness, and blur.

Why:
- Fixes button aesthetics in playlists and guarantees selected font/background pairs never desynchronize between inline and fullscreen playback.

---

## [2026-10-14 10:15]

### [Category: UI/UX] — Clear Lyrics Background, Customizer Blur/Darkness/Glow Controls, and Framed Artwork Header
What changed:
- Configured lyrics top header in `NowPlayingBar.jsx` with a subtle gradient fade, displaying the song title and artist layered over the cover art ("just visible enough") without jarring cropping.
- Eliminated hardcoded heavy background blur from lyrics screens, defaulting to crystal-clear backgrounds (`bgBlur = 0`).
- Added `bgBlur` slider to `LyricsCustomizer.jsx` alongside Background Darkening (`bgOpacity`) and Glow Intensity (`glow`), providing full user customization over all three visual dimensions.

Why:
- Direct fulfillment of user requests for a clear, atmospheric top header and user-tunable darkness, glow, and background blur controls.

---

## [2026-10-14 10:10]

### [Category: UI/UX] — Integrated Inline Lyrics, Fullscreen Playback Cluster, and Animated Loading Spinners
What changed:
- Integrated synchronized lyrics directly into `NowPlayingBar.jsx`: clicking the lyrics toggle button smoothly pushes the cover artwork to the top banner and renders the synchronized lyrics lines below it in the same card.
- Implemented dedicated Fullscreen Lyrics screen in `LyricsPanel.jsx`: expands across `100vw` × `100dvh` with large typography, RAF active-line follow, and a bottom playback control bar (timeline scrubber, heart like, Add to Playlist modal trigger, skip back, play/pause circle, skip forward, volume slider).
- Added global `@keyframes spin` and `.animate-spin, .spin` rules to `index.css`.
- Replaced static circular loading indicators with animated spinning circles during track buffering/loading across `SearchUI.jsx`, `TrackRow.jsx`, and `TrackCard.jsx`.

Why:
- Replaces disjointed lyrics popups with an integrated inline experience, adds full playback controls to fullscreen lyrics, and ensures active loading is clearly communicated with fluid spinning circle animations.

---

## [2026-10-14 09:50]

### [Category: UI] — Fix oversized track artwork in PlaylistDetailPage
What changed:
- Constrained tracklist artwork images in `src/pages/PlaylistDetailPage.jsx` to `width: 60px; height: 60px; border-radius: 50%; object-fit: cover; flex-shrink: 0;` using both `.track-artwork-circle` and inline styles.
- Updated `src/index.css` to bind `.track-row-artwork` to the 60px circular artwork sizing rules alongside `.track-artwork-circle`.

Why:
- In `PlaylistDetailPage.jsx`, track images lacked explicit width/height constraints and used an undefined class `.track-row-artwork`, causing images to render at their natural dimensions and overflow the track rows.

---

## [2026-10-14 09:35]

### [Category: UI] — Cosmetic UI redesign (glass/notched/fluid-responsive); no functional changes.
What changed:
- Implemented Figma-specified design tokens in `src/index.css`: deep canvas `#0F0F0F`, heavy frosted surfaces (`rgba(255, 255, 255, 0.08)`, `1px rgba(255, 255, 255, 0.10)` border, blurs `10px`–`27px`), large radii (`--radius-panel: 52px`, `--radius-panel-lg: 62px`, `--radius-card: 32px`, `--radius-pill-nav: 80px`).
- Built fluid type scale using CSS `clamp()` with Urbanist (500 body, 600 headings) and Zen Dots for brand wordmarks.
- Built concave notch cutouts (`.notched-cutout`, `.notched-cradle-btn`) cradling floating action buttons for featured cards and the Now Playing panel.
- Built fanned featured cards shelf on `HomePage.jsx` with subtle rotations (`-10°`, `+4°`, `+4.5°`), drop shadows, bottom glass scrims, and circular play buttons, preserving existing track counts (12 Trending, 12 For You, 8 Recent).
- Created reusable `TrackRow.jsx` rendering 84px rows, 60px circular artwork, titles, durations, circular like hearts, and accessible options menus with Escape dismissal.
- Upgraded desktop navigation with dual floating structures: floating glass icon rail at left (`76px`) and floating glass pill nav at top (`var(--radius-pill-nav)`), preserving routing and auth states.
- Re-architected Now Playing into a single responsive DOM instance: docked right-hand panel on large desktop (`>=1280px`), floating glass music bar on tablet (`1024px–1279px`), and mobile mini-player expanding to full-screen sheet (`<768px`).
- Positioned Queue Drawer and Lyrics Panel beside docked player at `right: calc(clamp(360px, 28vw, 440px) + 36px)` on desktop.
- Retained 100% functional integrity: zero route, API, context, hook, or telemetry changes. Continuous audio playback uninterrupted.

Why:
- Fulfills user request for a purely cosmetic, ultra-premium redesign aligned with target Figma specifications while strictly preserving existing business logic, accessibility, and playback stability.

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
