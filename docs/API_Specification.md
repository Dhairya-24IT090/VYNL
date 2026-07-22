# API Specification — VYNL

## 1. General Standards
- **Version:** `/api/v1/`
- **Format:** JSON
- **Standard Envelope:**
```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "request_id": "uuid",
    "timestamp": "iso8601"
  }
}
```

## 2. Authentication Service
- `POST /auth/register`: Create a new user account.
- `POST /auth/login`: Authenticate and receive JWT access/refresh tokens.
- `POST /auth/refresh`: Rotate refresh token for a new access token.
- `GET  /users/me`: Retrieve current user profile.

## 3. Catalog Service
- `GET /tracks/{id}`: Detailed track metadata.
- `GET /search`: Search tracks, artists, or albums (`?q=query&type=all`).
- `GET /genres`: List available genre categories.

## 4. Recommendation Service
- `GET  /recommendations/next`: Get the next recommended track (`?track_id=id`).
- `GET  /recommendations/explain/{track_id}`: Human-readable reason for the recommendation.
- `POST /playlists/auto-generate`: Generate a new playlist from a seed (`genre_id` or `artist_id`).

## 5. Playlist Service
- `GET  /playlists`: List user's playlists.
- `POST /playlists`: Create a new playlist.
- `GET  /playlists/{id}`: Get playlist tracks and metadata.
- `WS   /ws/playlists/{id}`: WebSocket connection for real-time collaborative editing.

## 6. Discussion Hub
- `GET  /channels/{genre}`: Get threads for a specific genre channel.
- `POST /threads`: Create a new discussion thread.
- `WS   /ws/threads/{thread_id}`: WebSocket connection for real-time chat.

## 7. Streaming Service
- `GET /stream/{track_id}/manifest`: Returns HLS/DASH manifest for adaptive playback.
- `GET /stream/{track_id}/chunk/{chunk_id}`: Proxies the audio chunk from Telegram.
- `GET /stream/{track_id}/download`: Download the full track for offline use.

## 8. Lyrics Service
- `GET /lyrics/{track_id}`: Returns synced lyrics with timestamps.
- `GET /lyrics/templates`: List available visual templates for lyrics.
