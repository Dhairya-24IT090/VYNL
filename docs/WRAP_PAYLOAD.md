# VYNL Monthly Wrap Payload Schema (`docs/WRAP_PAYLOAD.md`)

This document specifies the JSON response schema for `GET /v1/wrap/{yyyy-mm}` and the database payload stored in `wrap.monthly_wraps`.

---

## 1. Top-Level Schema

```json
{
  "user_id": "00000000-0000-0000-0000-000000000001",
  "period": "2026-09",
  "is_final": true,
  "empty": false,
  "generated_at": "2026-10-01T00:10:05.123Z",
  "partial_rollup": false,
  "summary": {
    "total_listened_ms": 36000000,
    "total_counted_plays": 240,
    "total_skips": 35,
    "skip_rate": 0.127,
    "unique_songs_count": 85,
    "unique_artists_count": 42,
    "new_artists_count": 12,
    "longest_daily_streak": 18
  },
  "top_songs": [
    {
      "song_id": "00000000-0000-0000-0000-000000000010",
      "title": "FLOWERS",
      "artists": [{"id": "uuid", "name": "Artist A"}],
      "plays": 45,
      "replays": 44,
      "listened_ms": 7800000,
      "artwork_url": "https://..."
    }
  ],
  "top_artists": [
    {
      "artist_id": "uuid",
      "name": "Artist A",
      "plays": 72,
      "image_url": "https://..."
    }
  ],
  "top_genres": [
    {
      "genre": "Synth-pop",
      "play_count": 98
    }
  ],
  "listening_patterns": {
    "peak_hour_utc": 21,
    "hour_histogram": [0, 0, 1, 0, 0, 2, 5, 12, 20, 15, 10, 8, 14, 18, 22, 25, 20, 18, 15, 22, 28, 30, 15, 5],
    "day_of_week_histogram": [32, 28, 40, 35, 50, 60, 45]
  }
}
```

---

## 2. Empty History Payload

For users with 0 events during the period:
```json
{
  "user_id": "00000000-0000-0000-0000-000000000002",
  "period": "2026-09",
  "is_final": true,
  "empty": true,
  "generated_at": "2026-10-01T00:10:05.123Z",
  "partial_rollup": false,
  "summary": {
    "total_listened_ms": 0,
    "total_counted_plays": 0,
    "total_skips": 0,
    "skip_rate": 0.0,
    "unique_songs_count": 0,
    "unique_artists_count": 0,
    "new_artists_count": 0,
    "longest_daily_streak": 0
  },
  "top_songs": [],
  "top_artists": [],
  "top_genres": [],
  "listening_patterns": {
    "peak_hour_utc": null,
    "hour_histogram": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "day_of_week_histogram": [0, 0, 0, 0, 0, 0, 0]
  }
}
```
