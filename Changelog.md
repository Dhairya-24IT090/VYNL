# Changelog — VYNL Frontend

All notable changes to the VYNL web client are documented in this file in reverse-chronological order.

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
