**VYNL**

**Software Requirements Specification (SRS)**

*AI-Powered Personalized Music Streaming Platform*

  ----------------------------------- -----------------------------------
  **Document Title**                  VYNL --- Software Requirements
                                      Specification

  **Version**                         1.0

  **Status**                          Draft

  **Date**                            09 August 2026

  **Conformance**                     Structured per IEEE 830 conventions

  **Related Documents**               VYNL PRD v1.0, VYNL System
                                      Architecture v1.0
  ----------------------------------- -----------------------------------

1\. Introduction

1.1 Purpose

This Software Requirements Specification (SRS) defines the functional
and non-functional requirements for VYNL, an AI-powered personalized
music streaming web platform. It translates the product intent described
in the PRD into verifiable software requirements that guide design,
implementation, and testing.

1.2 Scope

VYNL enables registered users to search, stream, and download music;
receive AI-generated, explainable song and playlist recommendations;
build playlists individually or collaboratively with AI assistance;
experience synchronized and customizable lyrics; and view a personalized
Monthly Wrap of their listening activity. The system also maintains an
internal Storage & Streaming pipeline, a Recommendation & Learning
pipeline, and a daily batch model-training process. This release targets
the web platform only.

1.3 Definitions, Acronyms, and Abbreviations

  -------------------------------------------------------------------------
  **Term**               **Definition**
  ---------------------- --------------------------------------------------
  AI/ML                  Artificial Intelligence / Machine Learning

  LLM                    Large Language Model, used to generate
                         natural-language recommendation explanations

  File ID                Unique reference issued by the audio storage
                         channel for a stored song file

  MVP                    Minimum Viable Product

  NFR                    Non-Functional Requirement

  FR                     Functional Requirement

  Queue                  The ordered list of upcoming songs for a user\'s
                         current listening session

  Wrap                   The Monthly Wrap listening-activity summary
                         feature

  Fetch-once-and-reuse   Pattern where a song is fetched from an external
                         source only once and reused from storage
                         thereafter
  -------------------------------------------------------------------------

1.4 References

-   VYNL Product Requirements Document (PRD), v1.0

-   VYNL System Architecture Document, v1.0

-   VYNL project brief / feature description (source material provided
    by stakeholders)

1.5 Overview

Section 2 describes the product context and overall characteristics.
Section 3 specifies detailed functional requirements grouped by feature
area. Section 4 specifies external interface requirements. Section 5
specifies non-functional requirements. Section 6 describes data
requirements. Section 7 documents key use cases.

2\. Overall Description

2.1 Product Perspective

VYNL is a new, self-contained web-based product. It integrates with
external services for song acquisition (an open-source Song API),
audio-feature enrichment (a local dataset with ReccoBeats/FreqBlog as
fallback), and release metadata (Discogs), and uses a private Telegram
channel as its persistent audio storage layer. It is not a plug-in or
extension of an existing platform.

2.2 Product Functions (Summary)

-   User registration, authentication, and session management.

-   Song search, playback, and queue management.

-   Fetch-once-and-reuse audio storage and streaming pipeline.

-   AI-driven next-song recommendation with LLM-generated explanations.

-   AI-assisted playlist generation from user-specified seeds.

-   Collaborative, multi-user playlist editing with AI suggestions.

-   Synchronized, customizable interactive lyrics display.

-   Song download for offline/personal use (where supported).

-   User activity logging and daily batch recommendation-model training.

-   Personalized Monthly Wrap generation.

2.3 User Classes and Characteristics

  -----------------------------------------------------------------------
  **User Class**            **Characteristics**
  ------------------------- ---------------------------------------------
  Registered Listener       Primary user class; searches, streams,
                            downloads, and interacts with recommendations
                            and playlists

  Collaborative Playlist    A registered listener participating in a
  Member                    shared playlist with other users

  System / Batch Processes  Non-human actor representing the scheduled
                            daily training job and background enrichment
                            tasks

  Administrator (limited    Monitors system health, data pipeline status,
  MVP scope)                and content availability
  -----------------------------------------------------------------------

2.4 Operating Environment

-   Client: modern desktop and mobile web browsers (current versions of
    Chrome, Firefox, Safari, Edge).

-   Server-side: cloud or server-hosted backend services (implementation
    stack to be finalized; see System Architecture).

-   External dependencies: open-source Song API, ReccoBeats/FreqBlog,
    Discogs, and a private Telegram channel used as the audio storage
    backend.

2.5 Design and Implementation Constraints

-   The specific backend/frontend technology stack is not finalized;
    requirements in this document are stack-agnostic.

-   Audio persistence depends on a private Telegram channel and its File
    ID mechanism, which the system must treat as an external storage
    dependency.

-   Recommendation-model retraining occurs on a daily batch schedule,
    not in real time.

-   Song attribute lookups prioritize a local dataset before falling
    back to external enrichment sources.

2.6 Assumptions and Dependencies

-   External APIs (Song API, ReccoBeats/FreqBlog, Discogs) remain
    available and within usable rate limits.

-   Telegram\'s file storage and File ID mechanism remain stable and
    accessible to the backend.

-   Sufficient daily user activity volume exists to make daily
    retraining effective.

3\. Functional Requirements

3.1 User Account & Authentication

  -----------------------------------------------------------------------
  **ID**      **Requirement**
  ----------- -----------------------------------------------------------
  FR-1.1      The system shall allow a new user to register an account
              with a unique identifier (e.g., email) and credentials.

  FR-1.2      The system shall authenticate a registered user before
              granting access to search, playback, playlist, and wrap
              features.

  FR-1.3      The system shall maintain a user session for the duration
              of an active visit and expire it after a defined period of
              inactivity.

  FR-1.4      The system shall allow a user to log out, terminating the
              active session.
  -----------------------------------------------------------------------

3.2 Song Search, Playback, and Storage/Streaming

  -----------------------------------------------------------------------
  **ID**      **Requirement**
  ----------- -----------------------------------------------------------
  FR-2.1      The system shall allow an authenticated user to search for
              a song by name.

  FR-2.2      Upon a song request, the system shall check the database to
              determine whether the song is already stored.

  FR-2.3      If the song already exists in the database, the system
              shall retrieve its stored File ID and generate a temporary
              playable/downloadable link without contacting the external
              Song API.

  FR-2.4      If the song does not exist in the database, the system
              shall request it from the open-source Song API, which shall
              return the song as an audio file.

  FR-2.5      The system shall upload a newly fetched audio file to the
              private Telegram channel used as persistent audio storage.

  FR-2.6      The system shall store the resulting unique File ID,
              together with the song\'s metadata and attributes, in the
              database for future reuse.

  FR-2.7      The system shall generate a temporary streaming/download
              link from a stored File ID whenever a song is requested.

  FR-2.8      The system shall play the requested song to the user via
              the generated temporary link.

  FR-2.9      Where supported, the system shall allow the user to
              download a song for offline or personal use.

  FR-2.10     The system shall retrieve song attributes (song_name,
              artist_name, artist_genres, artist_popularity,
              release_year, danceability, energy, valence, tempo,
              acousticness, speechiness, instrumentalness, liveness,
              popularity) from the local dataset when available.

  FR-2.11     If a song\'s attributes are not present in the local
              dataset, the system shall retrieve them from
              ReccoBeats/FreqBlog as a fallback source.

  FR-2.12     The system shall retrieve release-related metadata for a
              song/artist/album from Discogs and display it to the user
              during playback.

  FR-2.13     The system shall persist retrieved Discogs metadata in the
              database for reuse in future requests.
  -----------------------------------------------------------------------

3.3 AI-Assisted Queue & Recommendation

  -----------------------------------------------------------------------
  **ID**      **Requirement**
  ----------- -----------------------------------------------------------
  FR-3.1      When a user plays a song or playlist, the system shall
              analyze the user\'s listening history, prior interactions,
              and the current track\'s attributes as input to the
              recommendation model.

  FR-3.2      Upon completion of the current song or playlist, the system
              shall present a queue of AI-recommended songs generated by
              the ML recommendation model.

  FR-3.3      For each recommended song, the system shall generate a
              natural-language explanation using an LLM describing why
              the song was selected.

  FR-3.4      The LLM explanation shall incorporate both the user\'s
              listening history/preferences and the attributes of the
              recommended song.

  FR-3.5      The system shall add AI-recommended songs to the user\'s
              personal queue.
  -----------------------------------------------------------------------

3.4 AI-Assisted Playlist Creation

  -----------------------------------------------------------------------
  **ID**      **Requirement**
  ----------- -----------------------------------------------------------
  FR-4.1      The system shall allow a user to specify one or more genres
              and artists as playlist seeds.

  FR-4.2      The system shall allow a user to provide approximately 3-5
              reference songs representing the desired mood, style, or
              direction.

  FR-4.3      The system shall generate a complete, custom-curated
              playlist aligned with the specified genres, artists, and
              reference songs.

  FR-4.4      The system shall allow the user to save the AI-generated
              playlist for future access.
  -----------------------------------------------------------------------

3.5 Collaborative Playlists

  -----------------------------------------------------------------------
  **ID**      **Requirement**
  ----------- -----------------------------------------------------------
  FR-5.1      The system shall allow a user to create a playlist that
              supports contributions from multiple users.

  FR-5.2      The system shall allow invited/participating users to add,
              remove, or reorder songs within a shared playlist.

  FR-5.3      The system shall analyze the combined preferences and
              contributions of participating users to suggest additional
              songs likely to appeal to the group.

  FR-5.4      The system shall reflect changes made by any collaborator
              to all participants viewing the shared playlist.
  -----------------------------------------------------------------------

3.6 Synchronized Interactive Lyrics

  -----------------------------------------------------------------------
  **ID**      **Requirement**
  ----------- -----------------------------------------------------------
  FR-6.1      The system shall display lyrics synchronized to the
              currently playing position of a song, where lyric data is
              available.

  FR-6.2      The system shall progress the highlighted/active lyric line
              in real time as playback continues.

  FR-6.3      The system shall allow a user to select a pre-designed
              lyric backdrop for the lyrics display.

  FR-6.4      The system shall allow a user to upload a custom image to
              use as the lyrics backdrop.
  -----------------------------------------------------------------------

3.7 Activity Logging

  -----------------------------------------------------------------------
  **ID**      **Requirement**
  ----------- -----------------------------------------------------------
  FR-7.1      The system shall log user activities including songs
              searched, played, and skipped.

  FR-7.2      The system shall log listening duration for each played
              song.

  FR-7.3      The system shall log songs added to or removed from the
              queue and/or playlists.

  FR-7.4      The system shall log likes and user interactions with
              recommended songs and explanations.

  FR-7.5      The system shall persist logged activity in an accumulated
              activity store for use by the training pipeline.
  -----------------------------------------------------------------------

3.8 Daily Recommendation Model Training

  -----------------------------------------------------------------------
  **ID**      **Requirement**
  ----------- -----------------------------------------------------------
  FR-8.1      The system shall train the recommendation model once per
              day using accumulated user activity data collected since
              the previous training run.

  FR-8.2      The system shall replace the previously served
              recommendation model with the newly trained model upon
              successful completion of daily training.

  FR-8.3      The system shall continue logging user activity throughout
              the day regardless of training schedule, without triggering
              retraining on every individual interaction.
  -----------------------------------------------------------------------

3.9 Monthly Wrap

  -----------------------------------------------------------------------
  **ID**      **Requirement**
  ----------- -----------------------------------------------------------
  FR-9.1      The system shall generate a personalized Monthly Wrap for
              each active user at the end of each calendar month (or
              on-demand for the current month-to-date).

  FR-9.2      The Monthly Wrap shall include total listening activity,
              most-played songs, most-listened-to artists, favorite
              genres, listening patterns, frequently replayed songs,
              skipped songs, and newly discovered artists.

  FR-9.3      The system shall allow the user to view their Monthly Wrap
              within the application.
  -----------------------------------------------------------------------

4\. External Interface Requirements

4.1 User Interfaces

-   A responsive web UI providing: search, playback controls, personal
    queue, playlist management, collaborative playlist view,
    synchronized lyrics view, and Monthly Wrap view.

-   Recommendation explanations shall be visibly associated with their
    corresponding song in the queue/UI.

4.2 Hardware Interfaces

-   No specialized hardware is required; standard client devices
    (desktop/laptop/mobile) with audio output and internet connectivity
    are sufficient.

4.3 Software Interfaces

  -----------------------------------------------------------------------
  **Interface**              **Purpose**
  -------------------------- --------------------------------------------
  Open-Source Song API       Provides audio files for songs not already
                             stored in the system

  Telegram (Private Channel  Persistent audio storage; issues File IDs
  / Bot API)                 used for stream/download link generation

  Local Song Attributes      Primary source of song/artist audio-feature
  Dataset                    metadata

  ReccoBeats / FreqBlog      Fallback source for audio features when a
                             song is absent from the local dataset

  Discogs API                Source of release-related metadata (song,
                             artist, album, release)

  ML Recommendation Model    Internal service producing personalized song
  Service                    recommendations

  LLM Service                Internal/external service generating
                             natural-language recommendation explanations
  -----------------------------------------------------------------------

4.4 Communications Interfaces

-   All client-server communication shall occur over HTTPS.

-   Temporary streaming/download links shall be time-limited and shall
    not permanently expose the underlying storage reference.

5\. Non-Functional Requirements

5.1 Performance

  -----------------------------------------------------------------------
  **ID**      **Requirement**
  ----------- -----------------------------------------------------------
  NFR-1.1     For a song already stored in the system, playback shall
              begin within 3 seconds of request under normal load.

  NFR-1.2     For a song requiring first-time acquisition from the
              external Song API, playback shall begin within 10 seconds
              under normal load, excluding third-party API latency
              outside system control.

  NFR-1.3     The system shall support at least 500 concurrent active
              listening sessions at MVP/startup scale without degradation
              of core playback functionality.

  NFR-1.4     AI playlist generation from user seeds shall complete
              within 15 seconds under normal load.

  NFR-1.5     Daily model training shall complete within a defined
              maintenance window (e.g., overnight low-traffic hours)
              without impacting live recommendation serving.
  -----------------------------------------------------------------------

5.2 Scalability

-   The system shall be designed to scale horizontally at the
    application-service layer to accommodate MVP-to-growth-stage user
    increases.

-   The Storage & Streaming pipeline shall avoid redundant external API
    calls as the user base and song catalog grow, preserving the
    fetch-once-and-reuse pattern.

5.3 Availability and Reliability

  -----------------------------------------------------------------------
  **ID**      **Requirement**
  ----------- -----------------------------------------------------------
  NFR-3.1     Core playback, search, and streaming functionality shall
              target 99.5% monthly uptime for the MVP stage.

  NFR-3.2     If the ML recommendation service is temporarily
              unavailable, the system shall degrade gracefully (e.g.,
              fall back to recently popular or previously queued songs)
              rather than blocking playback.

  NFR-3.3     If the LLM explanation service is unavailable, the system
              shall still present the recommended song without blocking
              on the explanation.

  NFR-3.4     Failure of the daily training job shall not corrupt or
              discard the currently serving recommendation model; the
              previous model shall continue serving until a successful
              retrain occurs.
  -----------------------------------------------------------------------

5.4 Security

  -----------------------------------------------------------------------
  **ID**      **Requirement**
  ----------- -----------------------------------------------------------
  NFR-4.1     User credentials shall be stored using industry-standard
              hashing; plaintext passwords shall never be persisted or
              logged.

  NFR-4.2     All communication between client and server shall be
              encrypted in transit (HTTPS/TLS).

  NFR-4.3     Temporary streaming/download links shall expire after a
              limited time window and shall not be guessable/enumerable.

  NFR-4.4     Access to collaborative playlist edit actions shall be
              restricted to authenticated participants of that playlist.

  NFR-4.5     Credentials/tokens for external services (Song API,
              Telegram, Discogs) shall be stored securely and never
              exposed to the client.
  -----------------------------------------------------------------------

5.5 Usability

-   Core actions (search, play, queue, save playlist) shall be reachable
    within 3 interactions from the main screen.

-   Recommendation explanations shall be written in plain, non-technical
    language understandable to a general listener.

-   The interface shall be responsive across common desktop and mobile
    browser viewport sizes.

5.6 Maintainability

-   The Storage & Streaming, Recommendation, and LLM Explanation
    capabilities shall be logically separable services/modules to allow
    independent updates.

-   Audio-feature and metadata schemas shall be documented and versioned
    to support future dataset or provider changes.

5.7 Data Retention & Compliance

-   User activity data used for training shall be retained according to
    a defined retention policy to be established prior to production
    launch.

-   The system shall provide a mechanism for a user to request deletion
    of their account and associated personal data, consistent with
    applicable data-protection practices.

6\. Data Requirements

The following core entities are required to support the functional
requirements above. Exact schema/field types are to be finalized during
detailed design.

  -----------------------------------------------------------------------
  **Entity**         **Key Attributes (indicative)**
  ------------------ ----------------------------------------------------
  User               user_id, email, password_hash, created_at,
                     preferences

  Song               song_id, song_name, artist_name, artist_genres,
                     release_year, telegram_file_id, danceability,
                     energy, valence, tempo, acousticness, speechiness,
                     instrumentalness, liveness, popularity

  Discogs Metadata   song_id (ref), release info, label, catalog details

  Playlist           playlist_id, owner_id, title, is_collaborative,
                     song_ids\[\], created_at

  Playlist           playlist_id (ref), user_id (ref), role/permissions
  Collaborator       

  Queue              user_id (ref), ordered song_ids\[\], generated_at,
                     source (AI/manual)

  Recommendation     recommendation_id, user_id (ref), song_id (ref),
  Explanation        explanation_text, generated_at

  User Activity Log  activity_id, user_id (ref), song_id (ref),
                     action_type
                     (search/play/skip/like/queue_add/queue_remove),
                     timestamp, listening_duration

  Monthly Wrap       wrap_id, user_id (ref), period, top_songs\[\],
                     top_artists\[\], top_genres\[\], stats

  ML Model Version   model_id, trained_at, training_data_window, status
                     (active/inactive)
  -----------------------------------------------------------------------

7\. Key Use Cases

UC-1: Play a Song and Receive AI Recommendations

-   Actor: Registered Listener

-   Precondition: User is authenticated.

Main flow:

1.  User searches for and selects a song.

2.  System checks the database for an existing File ID; fetches from the
    Song API and stores in Telegram if not found.

3.  System retrieves/enriches song metadata and audio features.

4.  System streams the song to the user.

5.  On completion, system generates a recommended queue via the ML
    model.

6.  System generates an LLM explanation for each recommended song and
    presents the queue to the user.

UC-2: Generate an AI-Assisted Playlist

-   Actor: Registered Listener

Main flow:

1.  User provides genres, artists, and 3-5 reference songs.

2.  System analyzes inputs and generates a curated playlist.

3.  User reviews and saves the playlist.

UC-3: Collaborate on a Shared Playlist

-   Actors: Multiple Registered Listeners

Main flow:

1.  A user creates a collaborative playlist and invites participants.

2.  Participants add, remove, or reorder songs.

3.  System analyzes group contributions and suggests additional songs.

4.  Changes are reflected for all participants.

UC-4: View Monthly Wrap

-   Actor: Registered Listener

Main flow:

1.  System aggregates the user\'s activity data for the completed
    period.

2.  System generates the Wrap summary.

3.  User views their personalized Monthly Wrap.

UC-5: Daily Recommendation Model Training (System-Triggered)

-   Actor: System (scheduled batch process)

Main flow:

1.  Scheduler triggers the daily training job.

2.  Job retrieves accumulated activity data since the last training run.

3.  Model is retrained and validated.

4.  Updated model replaces the previous model for serving future
    recommendations.
