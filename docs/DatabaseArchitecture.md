# VYNL Database Architecture

**Status:** Derived design document — implementation has not started  
**Last updated:** 28 August 2026  
**Authority:** The PRD, SRS, and System Architecture remain the project source of truth. This document translates their database requirements into a design-ready model and records decisions that require confirmation.

## 1. Purpose

This document defines the database architecture required to support VYNL's documented flows:

- user authentication and profiles;
- fetch-once-and-reuse song acquisition, Telegram File ID storage, and metadata enrichment;
- queues, personal playlists, and collaborative playlists;
- immutable listener activity logging, recommendation serving, daily model training, and Monthly Wrap; and
- traceability of model versions and generated recommendation explanations.

It is a target architecture. None of the proposed application schema, migrations, Supabase project, or persistence integrations exists in the current codebase.

## 2. Reference set and precedence

Read these documents in this order before implementing database work:

| Priority | Document | Why it matters |
| --- | --- | --- |
| 1 | [PRD](PRD.md) | Defines product scope, users, features, MVP constraints, and the expected learning/storage flows. |
| 1 | [SRS](SRS.md) | Defines functional requirements, data entities, retention/compliance expectations, and use cases. |
| 1 | [System Architecture](SystemArchitecture.md) | Defines Supabase/PostgreSQL as the application database, Telegram storage, core services, and pipeline boundaries. |
| 2 | [The VYNL product brief](../The-VYNL.md) | Provides the detailed storage/streaming and recommendation/learning narratives. |
| 2 | [Frontend architecture](../FrontendArchitecture.md) | Defines the intended UI data shapes for tracks, queues, and player state. |
| 2 | [Streaming service context](../../vynl-streaming/CONTEXT.md) and [plan](../../vynl-streaming/PLAN.md) | Defines the present service behavior and its Phase 3/4 operational track/token proposal. |
| 2 | [Recommendation context](../../VNYL_music_recommendation/context.md) | Defines dataset artifacts, FAISS, UPS principles, and ML roadmap. |
| 2 | [`UserInteraction` and UPS code](../../VNYL_music_recommendation/src/interactions/models.py) | Defines the currently implemented event vocabulary, fields, immutability rule, and derived preference shape. |

If lower-priority material conflicts with the PRD/SRS/System Architecture, escalate the conflict for an architectural decision; do not let an implementation plan silently replace the authoritative architecture.

## 3. Microservice database strategy

VYNL is a microservice-based system. Every service owns its data and is the only service allowed to read or write its database directly. A service may expose data through a versioned API or publish a versioned domain event; it must never grant another service direct database access.

The authoritative System Architecture defines **Supabase (PostgreSQL)** as VYNL's primary relational database and says no traditional ORM is used for the MVP. In a microservice deployment, that means PostgreSQL/Supabase is the default relational technology, not one shared application database.

Use a separate Supabase project/database per independently deployed service whenever strong lifecycle, credential, backup, or scaling isolation is needed. If services initially share a Supabase organisation/project for operational reasons, give each service a separate schema, database role, migration history, credentials, and network policy. Treat that as an interim isolation measure, not permission to make cross-schema queries.

### 3.1 Service ownership map

| Service | Owned database / store | Owned data | Must not own |
| --- | --- | --- | --- |
| Identity service | `identity_db` (Supabase Auth + PostgreSQL) | Google OAuth identity mapping, profiles, consent, account lifecycle | Playlists, tracks, events, preferences |
| Catalog & metadata service | `catalog_db` (PostgreSQL/Supabase) | Canonical track, artist, album, provider-ID, audio-feature, and Discogs metadata | User data, playback events, stream tokens |
| Streaming & asset service | `streaming_db` (service-owned PostgreSQL or MongoDB) plus Telegram and optional Redis | Ingest state, audio-asset references, Telegram File IDs, service idempotency, short-lived stream tokens | Catalog truth, user profiles, playlists |
| Playlist & queue service | `playlist_db` (PostgreSQL/Supabase) | Playlists, collaborator roles, ordered playlist entries, queue sessions/items | Track/artist master metadata, preference scores |
| Activity service | `activity_db` (append-optimized PostgreSQL/Supabase) | Immutable listener events and event-retention lifecycle | Mutable user profile/catalog truth |
| Recommendation service | `recommendation_db` plus versioned ML artifacts | UPS/artist/genre projections, recommendation runs/items, model versions | Raw event truth, audio files, user-owned playlist state |
| Insights service | `insights_db` or a rebuildable projection store | Monthly Wrap materializations and aggregate snapshots | Raw source events as its only source of truth |

The API gateway and frontend own no product database. They retrieve data through service APIs and compose responses without introducing a shared persistence layer.

### 3.2 Global identity rules

Services use globally unique UUIDs but do not enforce physical foreign keys across databases. The owning service creates an ID; downstream services retain it as an external reference and validate it through APIs/events as necessary.

- The Identity service owns `user_id`. Supabase Auth's `auth.users.id` may be the global user UUID.
- The Catalog service owns canonical `track_id`, `artist_id`, and `album_id`.
- The Playlist service owns `playlist_id` and `queue_session_id`.
- The Activity service owns `event_id`.
- The Recommendation service owns `recommendation_run_id` and `model_version_id`.
- The Streaming service owns asset/ingest identifiers and references catalog-owned `track_id` only after a track is resolved/registered.

### 3.3 External and derived stores

| Store | Ownership | Purpose | Canonical? |
| --- | --- | --- | --- |
| Telegram private channel | External | Persistent audio object storage and File ID source | Canonical for audio object location, not relational product data |
| Local song attributes dataset / FAISS artifacts | ML pipeline | Bulk source data, feature matrix, scaler, and FAISS index | Versioned ML artifacts, not application-record storage |
| Supabase Storage (optional) | Owning service | User lyric backdrops or future approved media objects | Only if selected for that purpose |
| Redis (optional) | Owning service | Ephemeral cache/rate limits/short-lived stream tokens | Never canonical |

### 3.4 Streaming-service MongoDB proposal — decision required

`vynl-streaming/PLAN.md` proposes MongoDB `tracks` and `stream_tokens` collections for its future phases. MongoDB can be appropriate as a **service-owned operational database**; it must not duplicate Catalog or Identity ownership.

Until an ADR resolves this, apply the following rule:

- Catalog owns the canonical track record; Streaming owns the file/Telegram asset record and ingest lifecycle.
- MongoDB, if retained, may hold only streaming-local state or a replicated catalog projection. It must not become a second source of truth for catalog, user, playlist, or activity data.
- The Streaming service must use the Catalog-owned `track_id`, expose idempotent ingest behavior, and publish asset-status changes for other services to consume.
- Stream tokens are ephemeral and should use a TTL-capable operational store. They must never be persisted as permanent playback entitlement records.

**ADR-DB-001 required:** confirm whether the Streaming service uses MongoDB or PostgreSQL/Supabase for its own operational data.

## 4. Logical data model

The diagram is a logical view, not a single physical relational schema. Lines crossing a service boundary are API/event references, not database joins or cross-database foreign keys.

```text
Identity: auth.users 1──1 profiles

Playlist: user_id ──* playlists 1──* playlist_tracks ── track_id
Playlist: user_id ──* queue_sessions 1──* queue_items ── track_id
Playlist: playlists *──* users (through playlist_collaborators)

Catalog: artists 1──* albums 1──* tracks
Catalog: tracks 1──* track_external_ids
Catalog: tracks 1──1 track_audio_features
Catalog: tracks 1──* track_discogs_releases *──1 discogs_releases
Streaming: track_id 1──* audio_assets

Activity: user_id 1──* listener_events *──0..1 track_id
Recommendation: user_id 1──* user_track_preferences *──1 track_id
Recommendation: user_id 1──* recommendation_runs 1──* recommendation_items ── track_id
Recommendation: model_versions 1──* recommendation_runs
Insights: user_id 1──* monthly_wraps
```

## 5. Physical schema by service

Unless the service ADR states otherwise, use PostgreSQL/Supabase for each service. All primary IDs should be UUIDs generated by the owning service, timestamps should be `timestamptz`, and tables should contain `created_at` / `updated_at` where the row is mutable. Use `snake_case`. Foreign keys are valid only inside the owning service database; cross-service IDs are ordinary, indexed UUID reference columns.

### 5.1 Identity service: identity and authorization

| Table | Key columns | Constraints / notes |
| --- | --- | --- |
| `profiles` | `id`, `display_name`, `avatar_url`, `preferences jsonb` | `id` is PK/FK to `auth.users.id`; users can read/update only their own profile. |
| `user_roles` | `user_id`, `role` | Optional initial admin/support role mapping; not needed for ordinary listeners. |

Do not store `password_hash` in application tables: Supabase Auth owns credentials. This refines the indicative SRS `User` entity for the selected Google OAuth/Supabase design.

### 5.2 Catalog service: catalog and metadata

| Table | Key columns | Constraints / notes |
| --- | --- | --- |
| `artists` | `id`, `name`, `normalized_name`, `genres jsonb`, `popularity` | Unique normalized identity rule to be defined; retain provider IDs separately. |
| `albums` | `id`, `artist_id`, `title`, `release_date`, `release_year`, `artwork_url` | `artist_id` FK. |
| `tracks` | `id`, `album_id`, `primary_artist_id`, `title`, `normalized_title`, `duration_ms`, `explicit`, `availability_status` | Canonical VYNL track identity. Never use a title string as the dedup key. |
| `track_artists` | `track_id`, `artist_id`, `role`, `position` | Supports collaborations and preserves ordered artist credits. |
| `track_external_ids` | `id`, `track_id`, `provider`, `external_id`, `external_url`, `raw_payload jsonb` | Unique `(provider, external_id)`; includes Apple/iTunes ID, dataset `track_id`, ISRC, and later provider IDs. |
| `track_audio_features` | `track_id`, 13 ML feature columns, `feature_source`, `feature_version` | One current normalized/validated feature record per track version. |
| `discogs_releases` | `id`, `discogs_release_id`, `raw_payload jsonb`, release fields | Unique Discogs release ID. |
| `track_discogs_releases` | `track_id`, `discogs_release_id`, `match_confidence`, `is_primary` | Allows multiple candidate matches while identifying the chosen one. |

### 5.3 Streaming service: audio assets and stream tokens

| Store/table | Key columns | Constraints / notes |
| --- | --- | --- |
| `audio_assets` | `id`, `track_id`, `storage_provider`, `telegram_chat_id`, `telegram_message_id`, `telegram_file_id`, `file_unique_hash`, `mime_type`, `file_size_bytes`, `status` | `track_id` is an external Catalog reference. One or more source/quality assets per track; never expose Telegram identifiers to an untrusted client. |
| `ingest_operations` | `id`, `idempotency_key`, `track_id`, `status`, `failure_code`, `started_at`, `completed_at` | Unique idempotency key; prevents duplicate provider/Telegram work. |
| `stream_tokens` | `token`, `audio_asset_id`, `expires_at`, `requested_by` | TTL index/expiry; ephemeral, revocable, and not a user entitlement record. |

`audio_assets` implements the SRS/System Architecture File ID requirement. The audio bytes remain in the private Telegram channel; the Streaming service stores the secure reference and lifecycle metadata.

### 5.4 Playlist service: playlists, collaboration, and queues

| Table | Key columns | Constraints / notes |
| --- | --- | --- |
| `playlists` | `id`, `owner_id`, `title`, `description`, `is_collaborative`, `visibility` | `owner_id` is an external Identity-service reference, not an FK. |
| `playlist_collaborators` | `playlist_id`, `user_id`, `role`, `invited_at`, `accepted_at` | PK `(playlist_id, user_id)`; roles: `owner`, `editor`, `viewer`. |
| `playlist_tracks` | `playlist_id`, `track_id`, `position`, `added_by`, `added_at` | Unique `(playlist_id, position)`; permit duplicate tracks only if product rules later allow it. |
| `queue_sessions` | `id`, `user_id`, `source`, `generated_by_model_version_id`, `created_at`, `expires_at` | `source`: `manual`, `playlist`, `recommendation`, `mixed`. |
| `queue_items` | `queue_session_id`, `track_id`, `position`, `recommendation_item_id`, `added_at` | Unique `(queue_session_id, position)`. |

RLS or service-level authorization must restrict playlist and queue data to the owner and explicit collaborators. Collaborative mutations need transactional position updates to avoid concurrent reorder corruption.

### 5.5 Activity service: immutable listener events

| Table | Key columns | Constraints / notes |
| --- | --- | --- |
| `listener_events` | `id`, `user_id`, `track_id`, `action`, `occurred_at`, `listen_duration_seconds`, `completion_percentage`, `replay_count`, `device_type`, `context`, `payload jsonb`, `schema_version` | Append-only. `track_id` may be nullable only for search/navigation events before a track is selected. |

The action vocabulary must start with the existing `ActionType` enum: `PLAY`, `PAUSE`, `RESUME`, `SKIP`, `COMPLETE`, `REPLAY`, `LIKE`, `DISLIKE`, `REMOVE_LIKE`, `SHARE`, playlist actions, and search/discovery actions. Add a database check constraint or lookup table; version it when the contract evolves.

**Immutability rule:** never update or delete a valid historical event to apply score decay. Publish events to the Recommendation and Insights services through the event contract; those services create their own derived projections.

### 5.6 Recommendation service: preferences, recommendations, and models

| Table | Key columns | Constraints / notes |
| --- | --- | --- |
| `user_track_preferences` | `user_id`, `track_id`, `preference_score`, `interaction_count`, `last_interaction_at`, `calculated_at`, `algorithm_version` | Derived, rebuildable UPS projection; PK `(user_id, track_id)`. |
| `user_artist_preferences` | `user_id`, `artist_id`, score fields | Planned for the next ML phase. |
| `user_genre_preferences` | `user_id`, `genre`, score fields | Planned for the next ML phase. |
| `model_versions` | `id`, `model_type`, `artifact_uri`, `feature_version`, `training_window_start`, `training_window_end`, `metrics jsonb`, `status`, `activated_at` | Tracks active/retired/failed model versions and rollback. |
| `recommendation_runs` | `id`, `user_id`, `model_version_id`, `request_context jsonb`, `generated_at`, `fallback_reason` | A reproducible recommendation generation request. |
| `recommendation_items` | `id`, `recommendation_run_id`, `track_id`, `rank`, `score`, `reason_data jsonb`, `explanation_text`, `explanation_status` | Unique `(recommendation_run_id, rank)` and `(recommendation_run_id, track_id)`. |

An LLM explanation is an optional presentation result attached to a recommendation item. Recommendation generation must succeed even when explanation generation fails.

### 5.7 Insights service: Monthly Wrap

| Table | Key columns | Constraints / notes |
| --- | --- | --- |
| `monthly_wraps` | `id`, `user_id`, `period_start`, `period_end`, `status`, `summary jsonb`, `generated_at` | Unique `(user_id, period_start, period_end)`; rebuildable from retained activity events or approved aggregate feed. |

## 6. Service integration and consistency

### 6.1 Integration rules

- No service performs cross-service SQL joins, foreign keys, or transactions.
- A service publishes an event only after its local database transaction commits. Use an outbox table plus reliable dispatcher for any state change consumed by another service.
- Consumers must be idempotent: retain `event_id`, `event_type`, `event_version`, `occurred_at`, and producer name to prevent duplicate processing.
- Use asynchronous, eventually consistent projections for catalog copies, recommendation inputs, and Monthly Wrap aggregation. The user-facing service must communicate a processing state when immediate consistency is not available.
- Use a saga/compensating-action flow for multi-service operations such as ingest: Catalog track resolved -> Streaming asset stored -> Catalog availability updated. Do not use a distributed transaction.

### 6.2 Minimum event contract

| Event | Producer | Consumers | Minimum payload |
| --- | --- | --- | --- |
| `user.created` / `user.deleted` | Identity | Playlist, Activity, Recommendation, Insights | `user_id`, event ID/version, occurred time |
| `track.created` / `track.updated` | Catalog | Streaming, Playlist, Recommendation | `track_id`, external IDs/version, availability metadata |
| `audio_asset.available` / `audio_asset.failed` | Streaming | Catalog, API composition layer | `track_id`, asset ID, status, occurred time |
| `listener_event.recorded` | Activity | Recommendation, Insights | immutable event payload and schema version |
| `playlist.changed` | Playlist | Activity, Recommendation, Insights | playlist ID, actor ID, change type/version |
| `model.activated` | Recommendation | API composition layer | model version and activation time |
| `monthly_wrap.generated` | Insights | API composition layer | wrap ID, user ID, period, status |

## 7. Required indexes and performance plan

| Table | Index | Reason |
| --- | --- | --- |
| `track_external_ids` | unique `(provider, external_id)` | Deterministic external-ID lookup and ingest deduplication. |
| `tracks` | `(normalized_title, primary_artist_id)` | Catalog search/matching support. |
| `audio_assets` | `(track_id, status)` | Streaming-service lookup of a usable stored audio reference. |
| `playlist_tracks` | `(playlist_id, position)` unique | Ordered playlist reads/reorders. |
| `queue_items` | `(queue_session_id, position)` unique | Ordered queue reads. |
| `listener_events` | `(user_id, occurred_at desc)` and `(track_id, occurred_at desc)` | Recommendation features, history, and Wrap aggregation. |
| `user_track_preferences` | `(user_id, preference_score desc)` | Recommendation-service personalized candidate ranking. |
| `recommendation_items` | `(recommendation_run_id, rank)` | Queue/recommendation retrieval. |

Partition `listener_events` by month only after measured event volume warrants it. Begin with indexes and retention jobs; do not complicate an early implementation before an actual event-volume baseline exists.

## 8. Security, privacy, and retention

- Enable RLS on Supabase-backed user-owned tables. Service credentials must be scoped to the owning database only; clients should access data through the owning service or narrowly scoped Supabase policy, never with a cross-service credential.
- Keep Telegram File IDs, service API keys, provider tokens, and raw provider payloads server-side. Do not return them in browser-facing responses.
- Store only the event fields necessary for product and model needs. Define retention duration, deletion behavior, and aggregation/anonymization policy before production collection.
- Account deletion must cascade or anonymize user-owned records according to the product privacy policy, while preserving only legally permitted operational/audit data.
- Record consent/policy-version evidence if analytics or model-training consent requires it.

## 9. Migration and implementation sequence

1. Define service boundaries, global-ID rules, and API/event ownership before provisioning databases.
2. Create the Identity service database, Google OAuth integration, `profiles`, consent fields, and RLS policies.
3. Create Catalog and Streaming databases separately; resolve ADR-DB-001 before adding Streaming persistence.
4. Implement the versioned outbox/event contract and idempotent consumers before connecting Playlist, Activity, Recommendation, or Insights services.
5. Add Playlist/Queue service data and authorization, followed by the append-only Activity database.
6. Port in-memory UPS logic into Recommendation projections and add model/artifact versioning before enabling daily training/publication.
7. Add Insights/Monthly Wrap projections, retention jobs, backups, monitoring, and service-level migration/contract tests.

## 10. Open decisions required before schema migration

| ID | Decision | Owner / input needed |
| --- | --- | --- |
| ADR-DB-001 | Streaming persistence: service-local MongoDB or PostgreSQL/Supabase? | Architecture owner |
| ADR-DB-002 | Canonical track matching/deduplication policy across Apple/iTunes, ISRC, dataset, Discogs, and title/artist matches | Backend + ML |
| ADR-DB-003 | Final audio provider, permitted storage/streaming/download model, and retention requirements | Product + legal/compliance |
| ADR-DB-004 | API gateway/composition and database access model: service APIs only, or narrowly scoped direct Supabase access for selected user-owned data? | Backend + security |
| ADR-DB-007 | Event broker, outbox implementation, delivery guarantees, and schema-registry approach | Backend + platform |
| ADR-DB-005 | Event retention, deletion/anonymization, and model-training consent policy | Product + privacy |
| ADR-DB-006 | Lyric and uploaded-backdrop storage/provider model | Product + frontend + security |

## 11. Definition of ready

Database implementation is ready to begin only when ADR-DB-001 through ADR-DB-005 and ADR-DB-007 are resolved, the Track and event contracts are versioned, and each service has an approved migration, RLS/access-control, and contract-test plan. Until then, this document is a comprehensive design baseline rather than executable schema.
