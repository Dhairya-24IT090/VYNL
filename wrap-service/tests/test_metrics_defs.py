from datetime import datetime, timezone, timedelta
import pytest
from wrap_service.metrics_defs import (
    COUNTED_PLAY_THRESHOLD_MS,
    compute_longest_streak_days,
    compute_metrics,
    get_12_month_exclusion_window,
    is_counted_play,
    is_skip,
    parse_period,
)

def test_counted_play_threshold_boundary():
    """
    Precision test: 29,999ms is NOT a play, 30,000ms IS a play, 30,001ms IS a play.
    """
    assert is_counted_play("play", 29999) is False
    assert is_counted_play("play", 30000) is True
    assert is_counted_play("play", 30001) is True

    # Unknown event types with >= 30s are not counted plays
    assert is_counted_play("search", 40000) is False

def test_skip_classification_and_dual_classification():
    """
    Skip rules:
    - Explicit skip under 30s: skip only
    - Play under 30s: skip (implicit)
    - Dual classification: explicit skip >= 30,000ms is BOTH counted play and skip
    """
    # 1. Explicit skip under 30s
    assert is_skip("skip", 5000) is True
    assert is_counted_play("skip", 5000) is False

    # 2. Play under 30s (implicit skip)
    assert is_skip("play", 15000) is True
    assert is_counted_play("play", 15000) is False

    # 3. Dual classification: explicit skip after 45s
    assert is_skip("skip", 45000) is True
    assert is_counted_play("skip", 45000) is True

    # 4. Normal play >= 30s: play only, not skip
    assert is_skip("play", 45000) is False
    assert is_counted_play("play", 45000) is True

def test_utc_month_boundaries():
    """
    Evaluates strict UTC [period_start, next_month_start) window.
    """
    start, end = parse_period("2026-09")
    assert start == datetime(2026, 9, 1, 0, 0, 0, tzinfo=timezone.utc)
    assert end == datetime(2026, 10, 1, 0, 0, 0, tzinfo=timezone.utc)

    # December rolls into next year January
    dec_start, dec_end = parse_period("2026-12")
    assert dec_start == datetime(2026, 12, 1, 0, 0, 0, tzinfo=timezone.utc)
    assert dec_end == datetime(2027, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    events = [
        # Exactly 1ms before September (Aug 31 23:59:59.999 UTC) -> Excluded
        {"type": "play", "listened_ms": 60000, "song_id": "s1", "ts": "2026-08-31T23:59:59.999Z"},
        # First millisecond of September (Sep 01 00:00:00.000 UTC) -> Included
        {"type": "play", "listened_ms": 60000, "song_id": "s1", "ts": "2026-09-01T00:00:00.000Z"},
        # Last millisecond of September (Sep 30 23:59:59.999 UTC) -> Included
        {"type": "play", "listened_ms": 60000, "song_id": "s1", "ts": "2026-09-30T23:59:59.999Z"},
        # First millisecond of October (Oct 01 00:00:00.000 UTC) -> Excluded
        {"type": "play", "listened_ms": 60000, "song_id": "s1", "ts": "2026-10-01T00:00:00.000Z"},
    ]

    metrics = compute_metrics("2026-09", events)
    assert metrics["summary"]["total_counted_plays"] == 2
    assert metrics["summary"]["total_listened_ms"] == 120000

def test_loop_repeats_and_replays_calculation():
    """
    A track with N counted plays has max(0, N - 1) replays.
    """
    events = [
        {"type": "play", "listened_ms": 40000, "song_id": "s1", "ts": "2026-09-02T10:00:00Z"},
        {"type": "play", "listened_ms": 40000, "song_id": "s1", "ts": "2026-09-02T10:05:00Z"},
        {"type": "play", "listened_ms": 40000, "song_id": "s1", "ts": "2026-09-02T10:10:00Z"},
        # Song 2 with 1 play
        {"type": "play", "listened_ms": 40000, "song_id": "s2", "ts": "2026-09-03T11:00:00Z"},
    ]

    metrics = compute_metrics("2026-09", events)
    assert len(metrics["top_songs"]) == 2

    # Song 1: 3 plays, 2 replays
    s1 = next(s for s in metrics["top_songs"] if s["song_id"] == "s1")
    assert s1["plays"] == 3
    assert s1["replays"] == 2

    # Song 2: 1 play, 0 replays
    s2 = next(s for s in metrics["top_songs"] if s["song_id"] == "s2")
    assert s2["plays"] == 1
    assert s2["replays"] == 0

def test_newly_discovered_artists_12_month_rule():
    """
    Artist is newly discovered if:
    - >= 1 counted play in period P
    - 0 counted plays in [period_start - 12m, period_start)
    """
    metadata = {
        "s_new": {"title": "New Track", "artists": [{"id": "art_new", "name": "Fresh Artist"}]},
        "s_old": {"title": "Old Track", "artists": [{"id": "art_old", "name": "Veteran Artist"}]},
    }

    events = [
        {"type": "play", "listened_ms": 35000, "song_id": "s_new", "ts": "2026-09-05T12:00:00Z"},
        {"type": "play", "listened_ms": 35000, "song_id": "s_old", "ts": "2026-09-05T12:05:00Z"},
    ]

    # art_old was listened to 3 months ago (count=5 in past 12m)
    # art_new has 0 plays in past 12m
    historical = {
        "art_old": 5,
        "art_new": 0,
    }

    metrics = compute_metrics("2026-09", events, historical_artist_plays=historical, song_metadata_lookup=metadata)
    assert metrics["summary"]["new_artists_count"] == 1
    assert metrics["summary"]["unique_artists_count"] == 2

def test_longest_streak_days_calculation():
    """
    Calculates consecutive UTC active days.
    """
    dates = {
        datetime(2026, 9, 1).date(),
        datetime(2026, 9, 2).date(),
        datetime(2026, 9, 3).date(),
        # Gap on Sep 4
        datetime(2026, 9, 5).date(),
        datetime(2026, 9, 6).date(),
    }
    assert compute_longest_streak_days(dates) == 3

    # Empty returns 0
    assert compute_longest_streak_days(set()) == 0

def test_empty_period_returns_empty_payload():
    """
    User with 0 events during period returns valid empty schema.
    """
    metrics = compute_metrics("2026-09", [])
    assert metrics["empty"] is True
    assert metrics["summary"]["total_counted_plays"] == 0
    assert metrics["summary"]["total_listened_ms"] == 0
    assert metrics["listening_patterns"]["peak_hour_utc"] is None
    assert metrics["top_songs"] == []
    assert metrics["top_artists"] == []
