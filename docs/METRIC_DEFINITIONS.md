# VYNL Monthly Wrap Metric Definitions (`docs/METRIC_DEFINITIONS.md`)

This document defines the exact mathematical, temporal, and categorical rules for all listening metrics in VYNL Monthly Wrap.

---

## 1. Temporal Window & Boundaries

- **Period Format**: `YYYY-MM` (e.g., `2026-09`).
- **Timezone**: All calculations are evaluated strictly in **UTC**.
- **Window Range**: `[period_start, next_month_start)`.
  - Example: `2026-09` covers `2026-09-01T00:00:00.000Z` up to (and excluding) `2026-10-01T00:00:00.000Z`.
  - An event timestamped `2026-09-30T23:59:59.999Z` belongs to `2026-09`.
  - An event timestamped `2026-10-01T00:00:00.000Z` belongs to `2026-10`.

---

## 2. Core Metric Rules

### 2.1 Counted Play
- An activity event of type `play` counts as a **counted play** if and only if `listened_ms >= 30,000`.
- **Boundary Precision**:
  - `listened_ms = 29,999` -> **NOT** a counted play.
  - `listened_ms = 30,000` -> **COUNTED PLAY**.
  - `listened_ms = 30,001` -> **COUNTED PLAY**.

### 2.2 Replay
- A song has replay status in the period if it has **>= 2 counted plays** within the period `[period_start, next_month_start)`.
- If a song has 1 counted play, its replay count is 0.
- If a song has 3 counted plays, its replay count is 2 (replays beyond the initial play), and the song is flagged as a replayed track.

### 2.3 Skip
- An interaction is classified as a **skip** if:
  1. An explicit event of type `skip` was recorded, **OR**
  2. A `play` event occurred with `listened_ms < 30,000`.
- **Dual Classification Rule (Rev2 §16)**:
  - If an explicit `skip` event occurs after listening for `>= 30,000 ms`, the event is counted as **BOTH** a counted play (for listening time and track popularity) and a skip.

### 2.4 Newly Discovered Artist
- An artist qualifies as **newly discovered** in period `P` if:
  1. The user has **>= 1 counted play** for any song by that artist within period `P`, **AND**
  2. The user had **0 counted plays** for that artist across the preceding 12 calendar months:
     `[period_start - 12 months, period_start)`.
- **Boundary Rule**:
  - If a user listened to the artist at `period_start - 12 months` (exact millisecond), that listen falls inside the 12-month exclusion window, so the artist is **NOT** newly discovered.
  - If the last listen was at `period_start - 12 months - 1 ms` (13 months ago), the artist **IS** newly discovered.

### 2.5 Multi-Artist Songs & Genre Attribution
- Multi-artist tracks credit **each artist individually and equally** for total play count and discovery metrics.
- Track genres are inherited from the primary artist's mapped genres when track-specific tags are absent.

---

## 3. Aggregation Output & Summaries

The monthly wrap computes:
1. `total_listened_ms`: Sum of `listened_ms` across all plays.
2. `total_counted_plays`: Total number of plays with `listened_ms >= 30,000`.
3. `top_songs`: Top 10 songs ordered by counted plays desc, then total listened time desc.
4. `top_artists`: Top 10 artists ordered by counted plays desc.
5. `top_genres`: Top 5 genres ordered by play occurrences.
6. `listening_patterns`:
   - `hour_histogram`: 24-element array (UTC hours 0–23) of plays.
   - `day_of_week_histogram`: 7-element array (Monday=0 to Sunday=6).
   - `peak_hour`: Hour with highest volume.
   - `longest_streak_days`: Maximum consecutive UTC days with >= 1 counted play.
7. `skip_rate`: `skips / (counted_plays + skips)`.
8. `new_artists_count`: Count of unique newly discovered artists.
9. `empty`: Boolean flag indicating whether the user had 0 listening events during the period.
