"""
Pure metric calculation definitions for VYNL Monthly Wrap per docs/METRIC_DEFINITIONS.md.
No network or database dependencies. Strict UTC evaluation.
"""
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple
from collections import defaultdict

COUNTED_PLAY_THRESHOLD_MS = 30000

def parse_period(period_str: str) -> Tuple[datetime, datetime]:
    """
    Parses 'YYYY-MM' into [period_start, next_month_start) in strict UTC.
    Period start is 1st of month at 00:00:00.000Z.
    Next month start is 1st of following month at 00:00:00.000Z.
    """
    parts = period_str.strip().split("-")
    if len(parts) != 2:
        raise ValueError(f"Invalid period format: {period_str}, expected YYYY-MM")
    year = int(parts[0])
    month = int(parts[1])
    if not (1 <= month <= 12):
        raise ValueError(f"Invalid month: {month}")

    start = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
    if month == 12:
        next_month = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    else:
        next_month = datetime(year, month + 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    return start, next_month

def get_12_month_exclusion_window(period_start: datetime) -> Tuple[datetime, datetime]:
    """
    Returns [period_start - 12 months, period_start) in UTC.
    """
    year = period_start.year - 1
    month = period_start.month
    exclusion_start = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
    return exclusion_start, period_start

def is_counted_play(event_type: str, listened_ms: int) -> bool:
    """
    Counted play if event_type in ('play', 'skip') and listened_ms >= 30,000.
    Dual classification: an explicit skip with listened_ms >= 30,000 is also a counted play.
    """
    if event_type in ("play", "skip") and listened_ms >= COUNTED_PLAY_THRESHOLD_MS:
        return True
    return False

def is_skip(event_type: str, listened_ms: int) -> bool:
    """
    Classified as skip if:
    1. Explicit 'skip' event, OR
    2. 'play' event with listened_ms < 30,000
    """
    if event_type == "skip":
        return True
    if event_type == "play" and listened_ms < COUNTED_PLAY_THRESHOLD_MS:
        return True
    return False

def compute_longest_streak_days(active_dates: Set[datetime.date]) -> int:
    """
    Calculates the maximum consecutive days streak from a set of UTC dates.
    """
    if not active_dates:
        return 0

    sorted_dates = sorted(active_dates)
    max_streak = 1
    current_streak = 1

    for i in range(1, len(sorted_dates)):
        diff = (sorted_dates[i] - sorted_dates[i - 1]).days
        if diff == 1:
            current_streak += 1
            if current_streak > max_streak:
                max_streak = current_streak
        elif diff > 1:
            current_streak = 1

    return max_streak

def compute_metrics(
    period_str: str,
    events: List[Dict[str, Any]],
    historical_artist_plays: Optional[Dict[str, int]] = None,
    song_metadata_lookup: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Computes all wrap metrics for a given period and activity events list.
    historical_artist_plays: artist_id -> counted_plays in [period_start - 12 months, period_start)
    song_metadata_lookup: song_id -> {title, artists: [{id, name}], genres: [...], artwork_url}
    """
    period_start, period_end = parse_period(period_str)
    hist_artists = historical_artist_plays or {}
    metadata = song_metadata_lookup or {}

    # Filter events strictly belonging to [period_start, period_end)
    period_events = []
    for ev in events:
        ts = ev.get("ts")
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if period_start <= ts < period_end:
            period_events.append((ts, ev))

    if not period_events:
        # Empty payload
        return {
            "period": period_str,
            "is_final": True,
            "empty": True,
            "partial_rollup": False,
            "summary": {
                "total_listened_ms": 0,
                "total_counted_plays": 0,
                "total_skips": 0,
                "skip_rate": 0.0,
                "unique_songs_count": 0,
                "unique_artists_count": 0,
                "new_artists_count": 0,
                "longest_daily_streak": 0,
            },
            "top_songs": [],
            "top_artists": [],
            "top_genres": [],
            "listening_patterns": {
                "peak_hour_utc": None,
                "hour_histogram": [0] * 24,
                "day_of_week_histogram": [0] * 7,
            },
        }

    total_listened_ms = 0
    total_counted_plays = 0
    total_skips = 0

    hour_histogram = [0] * 24
    dow_histogram = [0] * 7
    active_dates: Set[datetime.date] = set()

    song_plays: Dict[str, int] = defaultdict(int)
    song_listened_ms: Dict[str, int] = defaultdict(int)
    artist_plays: Dict[str, int] = defaultdict(int)
    artist_names: Dict[str, str] = {}
    genre_counts: Dict[str, int] = defaultdict(int)
    period_active_artists: Set[str] = set()

    for ts, ev in period_events:
        ev_type = ev.get("type", "play")
        l_ms = ev.get("listened_ms", 0)
        song_id = ev.get("song_id")

        total_listened_ms += l_ms
        if song_id:
            song_listened_ms[song_id] += l_ms

        counted = is_counted_play(ev_type, l_ms)
        skipped = is_skip(ev_type, l_ms)

        if skipped:
            total_skips += 1

        if counted:
            total_counted_plays += 1
            hour_histogram[ts.hour] += 1
            dow_histogram[ts.weekday()] += 1
            active_dates.add(ts.date())

            if song_id:
                song_plays[song_id] += 1
                song_meta = metadata.get(song_id, {})
                artists = song_meta.get("artists", [])
                for art in artists:
                    a_id = art.get("id") or art.get("artist_id")
                    a_name = art.get("name") or "Unknown Artist"
                    if a_id:
                        artist_plays[a_id] += 1
                        artist_names[a_id] = a_name
                        period_active_artists.add(a_id)

                for g in song_meta.get("genres", []):
                    genre_counts[g] += 1

    # Skip rate
    total_interactions = total_counted_plays + total_skips
    skip_rate = round(total_skips / total_interactions, 3) if total_interactions > 0 else 0.0

    # Longest streak
    longest_streak = compute_longest_streak_days(active_dates)

    # Peak hour
    peak_hour = None
    if total_counted_plays > 0:
        peak_hour = max(range(24), key=lambda h: hour_histogram[h])

    # Top songs (Top 10: ordered by plays desc, then listened_ms desc)
    sorted_songs = sorted(
        song_plays.keys(),
        key=lambda s_id: (song_plays[s_id], song_listened_ms[s_id]),
        reverse=True
    )[:10]

    top_songs = []
    for s_id in sorted_songs:
        meta = metadata.get(s_id, {})
        plays = song_plays[s_id]
        replays = max(0, plays - 1)
        top_songs.append({
            "song_id": s_id,
            "title": meta.get("title", f"Track {s_id[:8]}"),
            "artists": meta.get("artists", [{"id": "unknown", "name": "Unknown Artist"}]),
            "plays": plays,
            "replays": replays,
            "listened_ms": song_listened_ms[s_id],
            "artwork_url": meta.get("artwork_url", ""),
        })

    # Top artists (Top 10: ordered by plays desc)
    sorted_artists = sorted(
        artist_plays.keys(),
        key=lambda a_id: artist_plays[a_id],
        reverse=True
    )[:10]

    top_artists = []
    for a_id in sorted_artists:
        top_artists.append({
            "artist_id": a_id,
            "name": artist_names.get(a_id, "Unknown Artist"),
            "plays": artist_plays[a_id],
            "image_url": "",
        })

    # Top genres (Top 5: ordered by count desc)
    sorted_genres = sorted(
        genre_counts.keys(),
        key=lambda g: genre_counts[g],
        reverse=True
    )[:5]
    top_genres = [{"genre": g, "play_count": genre_counts[g]} for g in sorted_genres]

    # Newly discovered artists: active in period P and 0 plays in past 12 months
    new_artists = [a for a in period_active_artists if hist_artists.get(a, 0) == 0]

    return {
        "period": period_str,
        "is_final": True,
        "empty": False,
        "partial_rollup": False,
        "summary": {
            "total_listened_ms": total_listened_ms,
            "total_counted_plays": total_counted_plays,
            "total_skips": total_skips,
            "skip_rate": skip_rate,
            "unique_songs_count": len(song_plays),
            "unique_artists_count": len(artist_plays),
            "new_artists_count": len(new_artists),
            "longest_daily_streak": longest_streak,
        },
        "top_songs": top_songs,
        "top_artists": top_artists,
        "top_genres": top_genres,
        "listening_patterns": {
            "peak_hour_utc": peak_hour,
            "hour_histogram": hour_histogram,
            "day_of_week_histogram": dow_histogram,
        },
    }
