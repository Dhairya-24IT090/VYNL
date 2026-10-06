import pytest
from wrap_service.aggregation import WrapAggregator

@pytest.mark.asyncio
async def test_aggregation_matches_golden_fixture():
    """
    Task 33 Done when: Output matches hand-calculated fixture.
    """
    aggregator = WrapAggregator()

    user_id = "00000000-0000-0000-0000-000000000001"
    period = "2026-09"

    song_metadata = {
        "s_flowers": {
            "title": "FLOWERS",
            "artists": [{"id": "art_a", "name": "Artist A"}],
            "genres": ["Synth-pop", "Disco"],
            "artwork_url": "https://cdn.vynl.app/art/flowers.jpg",
        },
        "s_midnight": {
            "title": "MIDNIGHT",
            "artists": [
                {"id": "art_a", "name": "Artist A"},
                {"id": "art_b", "name": "Artist B"},
            ],
            "genres": ["Synth-pop"],
            "artwork_url": "https://cdn.vynl.app/art/midnight.jpg",
        },
        "s_sunrise": {
            "title": "SUNRISE",
            "artists": [{"id": "art_c", "name": "Artist C"}],
            "genres": ["Indie Rock"],
            "artwork_url": "https://cdn.vynl.app/art/sunrise.jpg",
        },
    }

    # Historical artist plays in preceding 12 months
    historical_artists = {
        "art_a": 15,  # Known artist
        "art_b": 0,   # Newly discovered artist
        "art_c": 0,   # Newly discovered artist
    }

    # Hand-crafted activity stream
    raw_events = [
        # Song 1: FLOWERS
        {"type": "play", "song_id": "s_flowers", "listened_ms": 45000, "ts": "2026-09-02T10:00:00Z"},
        {"type": "play", "song_id": "s_flowers", "listened_ms": 50000, "ts": "2026-09-02T10:05:00Z"},
        {"type": "play", "song_id": "s_flowers", "listened_ms": 35000, "ts": "2026-09-03T11:00:00Z"},
        # Song 2: MIDNIGHT
        {"type": "play", "song_id": "s_midnight", "listened_ms": 40000, "ts": "2026-09-03T11:30:00Z"},
        {"type": "skip", "song_id": "s_midnight", "listened_ms": 20000, "ts": "2026-09-04T14:00:00Z"},
        # Song 3: SUNRISE
        {"type": "play", "song_id": "s_sunrise", "listened_ms": 10000, "ts": "2026-09-05T21:00:00Z"}, # <30s implicit skip
        {"type": "play", "song_id": "s_sunrise", "listened_ms": 60000, "ts": "2026-09-06T21:05:00Z"},
    ]

    result = await aggregator.aggregate_user_wrap(
        user_id=user_id,
        period_str=period,
        raw_events=raw_events,
        historical_artist_plays=historical_artists,
        song_metadata_lookup=song_metadata,
        is_final=True,
    )

    # 1. Top-level envelope
    assert result["user_id"] == user_id
    assert result["period"] == "2026-09"
    assert result["is_final"] is True
    assert result["empty"] is False
    assert result["partial_rollup"] is False

    # 2. Summary comparisons against hand calculations
    summary = result["summary"]
    # 45k + 50k + 35k + 40k + 20k + 10k + 60k = 260,000ms
    assert summary["total_listened_ms"] == 260000
    # Counted plays: 3 (flowers) + 1 (midnight) + 1 (sunrise) = 5
    assert summary["total_counted_plays"] == 5
    # Skips: 1 (explicit midnight) + 1 (implicit sunrise) = 2
    assert summary["total_skips"] == 2
    # Skip rate: 2 / 7 = 0.286
    assert summary["skip_rate"] == 0.286
    # Unique entities
    assert summary["unique_songs_count"] == 3
    assert summary["unique_artists_count"] == 3
    # New artists: art_b, art_c = 2
    assert summary["new_artists_count"] == 2
    # Streak: Sep 2, Sep 3 active (consecutive=2)
    assert summary["longest_daily_streak"] == 2

    # 3. Top songs hand comparison
    assert len(result["top_songs"]) == 3
    top_song = result["top_songs"][0]
    assert top_song["song_id"] == "s_flowers"
    assert top_song["title"] == "FLOWERS"
    assert top_song["plays"] == 3
    assert top_song["replays"] == 2
    assert top_song["listened_ms"] == 130000

    # 4. Top artists
    assert len(result["top_artists"]) == 3
    assert result["top_artists"][0]["artist_id"] == "art_a"
    assert result["top_artists"][0]["plays"] == 4  # 3 flowers + 1 midnight

    # 5. Top genres
    assert len(result["top_genres"]) >= 2
    # Synth-pop: 3 flowers + 1 midnight = 4
    assert result["top_genres"][0]["genre"] == "Synth-pop"
    assert result["top_genres"][0]["play_count"] == 4

    # 6. Histograms
    patterns = result["listening_patterns"]
    assert sum(patterns["hour_histogram"]) == 5
    assert sum(patterns["day_of_week_histogram"]) == 5
    assert patterns["peak_hour_utc"] in (10, 11)

@pytest.mark.asyncio
async def test_aggregation_with_daily_rollups():
    """
    Verifies daily rollup integration alongside raw events.
    """
    aggregator = WrapAggregator()
    user_id = "user_rollup_test"
    period = "2026-09"

    rollup_day1 = {
        "day": "2026-09-01",
        "events": [
            {"type": "play", "song_id": "s_roll_1", "listened_ms": 60000, "ts": "2026-09-01T12:00:00Z"},
        ]
    }

    raw_events = [
        {"type": "play", "song_id": "s_roll_2", "listened_ms": 40000, "ts": "2026-09-15T15:00:00Z"},
    ]

    result = await aggregator.aggregate_user_wrap(
        user_id=user_id,
        period_str=period,
        raw_events=raw_events,
        daily_rollups=[rollup_day1],
        is_final=False,
    )

    assert result["summary"]["total_counted_plays"] == 2
    assert result["summary"]["total_listened_ms"] == 100000
    assert result["partial_rollup"] is True
