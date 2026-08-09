**VYNL**

**System Architecture Document**

*AI-Powered Personalized Music Streaming Platform*

  ----------------------------------- -----------------------------------
  **Document Title**                  VYNL --- System Architecture
                                      Document

  **Version**                         1.0

  **Status**                          Draft --- Conceptual (technology
                                      stack not yet finalized)

  **Date**                            09 August 2026

  **Related Documents**               VYNL PRD v1.0, VYNL SRS v1.0
  ----------------------------------- -----------------------------------

1\. Purpose and Architectural Approach

This document describes the architecture of VYNL at a conceptual,
component level. Because the implementation technology stack has not yet
been finalized, the architecture is expressed in terms of logical
layers, services, data stores, and integration points rather than
specific frameworks, languages, or vendor products. This allows the
architecture to remain valid as concrete technology choices are made
during detailed design, while still giving engineering teams a clear
structural blueprint to implement against.

1.1 Architectural Principles

-   Separation of concerns: streaming/storage, recommendation,
    explanation, and collaboration are distinct logical services.

-   Fetch-once-and-reuse: external audio and metadata sources are called
    only when data is not already persisted.

-   Graceful degradation: the ML and LLM layers are auxiliary to core
    playback and must not block it if unavailable.

-   Batch-oriented learning: recommendation quality improves through a
    scheduled daily training cycle rather than per-interaction
    retraining.

-   Stack-agnostic services: each logical service can be implemented and
    scaled independently, regardless of eventual technology choice.

2\. High-Level Architecture Overview

VYNL is organized into five conceptual layers: a Client Layer (web
application), an Application/API Layer (authentication and request
routing), a Core Service Layer (domain services), a Data & Storage Layer
(application database, persistent audio storage, and local dataset), and
an External Integrations & Batch Jobs layer (third-party APIs and the
scheduled training job). The diagram below summarizes the layered
structure and the primary dependencies between layers.

![](media/897c9743c183faf6cc61bc81b2fa5d1eb1a8eddd.png){width="6.4in"
height="4.741926946631671in"}

*Figure 1 --- VYNL high-level layered architecture (conceptual).*

2.1 Layer Descriptions

  -----------------------------------------------------------------------
  **Layer**            **Responsibility**
  -------------------- --------------------------------------------------
  1\. Client Layer     Web application UI: playback, AI playlist builder,
                       collaborative playlists, synchronized lyrics,
                       Monthly Wrap

  2\. Application /    Authentication/session management and a backend
  API Layer            API gateway that routes requests to core services

  3\. Core Service     Storage & Streaming, Recommendation (ML), LLM
  Layer                Explanation, Playlist/Collaboration, Activity
                       Logging, Monthly Wrap, Metadata/Audio-Feature
                       Enrichment

  4\. Data & Storage   Application database, Telegram-based persistent
  Layer                audio storage, local song-attribute dataset,
                       accumulated activity store

  5\. External         Open-source Song API, ReccoBeats/FreqBlog,
  Integrations & Batch Discogs, and the scheduled daily ML training job
  Jobs                 
  -----------------------------------------------------------------------

3\. Component Descriptions

3.1 Web Application (Client)

The single web client through which all user interaction occurs. It
hosts playback controls, search, the personal queue, AI playlist
builder, collaborative playlist editor, synchronized/customizable lyrics
view, and the Monthly Wrap view. It communicates with the backend
exclusively through the API layer.

3.2 Authentication & Session Service

Handles registration, login, credential verification, and session/token
lifecycle management. All other services treat this as the source of
truth for \"who is making this request.\"

3.3 Backend Application Server / API Gateway

Receives client requests, enforces authentication, and routes each
request to the appropriate core service. Acts as the single entry point
so the client does not need to know the internal service topology.

3.4 Storage & Streaming Service

Implements the fetch-once-and-reuse pipeline described in Section 4.
Responsible for checking the database for an existing song, fetching
from the external Song API when necessary, uploading new audio to the
Telegram private channel, storing the resulting File ID, and generating
temporary streaming/download links.

3.5 Metadata & Audio-Feature Enrichment Service

Resolves song attributes (danceability, energy, valence, tempo, etc.) by
first checking the local dataset and falling back to ReccoBeats/FreqBlog
when a song is not present locally. Also retrieves and persists Discogs
release metadata for display and reuse.

3.6 Recommendation Service (ML Model)

Serves personalized song recommendations using a model trained on
accumulated user activity, listening history, and song attributes.
Consumes model input features and produces a ranked/selected list of
songs for the user\'s personal queue. Retrained daily by the batch
training job (Section 3.10).

3.7 LLM Explanation Service

Generates a natural-language explanation for each recommended song,
using the user\'s listening context (history, preferences, recent
interactions) and the recommended song\'s attributes (genre, tempo,
energy, artist, etc.) as prompt context. This service is decoupled from
the Recommendation Service so that explanation generation can fail
independently without blocking the recommendation itself.

3.8 Playlist & Collaboration Service

Manages creation, editing, and membership of both individual and
collaborative playlists. For collaborative playlists, aggregates the
contributions/preferences of all participants and forwards this context
to the Recommendation Service to source group-suggested songs.

3.9 Activity Logging Service

Captures user interaction events --- searches, plays, skips, listening
duration, queue/playlist changes, likes, and interactions with
recommendations --- and persists them to the accumulated activity store
that feeds the daily training job.

3.10 Daily ML Training Job (Batch)

A scheduled process, run once per day, that retrains the recommendation
model using the activity accumulated since the previous run. On
successful completion, the updated model becomes the active model used
by the Recommendation Service; if training fails, the previously active
model continues to serve requests.

3.11 Monthly Wrap Service

Aggregates a user\'s activity data over a monthly period to compute
listening statistics (top songs, top artists, favorite genres, listening
patterns, skipped/replayed songs, newly discovered artists) and produces
the personalized Monthly Wrap.

3.12 Data Stores

-   Application Database --- canonical store for users, songs, metadata,
    File ID references, playlists, and activity summaries.

-   Telegram Private Channel --- persistent audio storage; source of
    unique File IDs used to generate temporary streaming/download links.

-   Local Song Attributes Dataset --- primary lookup source for audio
    features and song metadata.

-   Accumulated User Activity Store --- durable log of user
    interactions, read by the daily training job.

4\. Storage & Streaming Pipeline (Detailed View)

This pipeline governs how songs are acquired, stored, enriched, and
delivered while avoiding unnecessary repeated external API calls. When a
song is requested, the system first checks whether it is already present
in the database. If present, the stored File ID is used to generate a
temporary playback/download link directly. If absent, the song is
fetched from the open-source Song API, uploaded to the private Telegram
channel for persistent storage, and the resulting File ID is saved to
the database along with retrieved metadata and audio features.

![](media/86507484b1eecbd868e5a8420a150680be155a85.png){width="6.2in"
height="3.7478510498687663in"}

*Figure 2 --- Storage & Streaming pipeline.*

Audio-feature attributes are resolved from the local dataset first, with
ReccoBeats/FreqBlog used only as a fallback when a song is not found
locally. Discogs metadata is retrieved separately and stored alongside
the song record for reuse on future requests. The overall flow follows a
fetch-once-and-reuse pattern: user requests a song → database lookup →
(if missing) fetch from external API → store audio in Telegram → save
File ID → retrieve/store metadata and audio features → generate a
temporary playback link → stream to the user.

5\. Recommendation & Learning Pipeline (Detailed View)

This pipeline governs how personalized recommendations and their
explanations are produced, and how the recommendation model improves
over time. Playback requests flow through the Storage & Streaming
pipeline described above; in parallel, the backend supplies the
Recommendation Service with the user\'s listening history, interaction
patterns, and the audio characteristics/metadata of recently consumed
songs to produce a personalized set of recommended songs for the user\'s
queue.

![](media/93dac1f2ad79fa24e3fe726550f5cde3e1cea25e.png){width="6.0in"
height="4.347656386701662in"}

*Figure 3 --- Recommendation & Learning pipeline, including the daily
training loop.*

Each recommended song is paired with an LLM-generated explanation, built
from two context sources: the user\'s listening behavior/preferences and
the recommended song\'s own attributes (genre, tempo, energy, artist,
etc.). In parallel, all user interactions --- searches, plays, skips,
durations, queue/playlist actions, likes, and interactions with
recommendations --- are logged to the accumulated activity store. This
store is consumed once per day by the training job, which produces an
updated recommendation model that serves subsequent requests. Two levels
of personalization result: the ML model determines which songs are
recommended, while the LLM determines how the reasoning behind each
recommendation is explained.

6\. End-to-End Data Flow Summary

1.  User authenticates via the Authentication & Session Service.

2.  User searches for and plays a song; the request is routed through
    the API Gateway to the Storage & Streaming Service.

3.  The Storage & Streaming Service resolves the song (database hit or
    external fetch + Telegram storage) and returns a temporary streaming
    link.

4.  The Metadata & Audio-Feature Enrichment Service ensures attributes
    and Discogs metadata are available and persisted.

5.  The Activity Logging Service records the play event and subsequent
    interactions (skip, duration, likes, queue changes).

6.  On completion of playback, the Recommendation Service produces a
    personalized queue using listening history and song attributes.

7.  The LLM Explanation Service generates a reasoning string for each
    recommended song, which is attached to the queue entry shown to the
    user.

8.  Once per day, the Daily ML Training Job consumes the accumulated
    activity store and produces an updated recommendation model, which
    becomes active for subsequent requests.

9.  At the end of each month, the Monthly Wrap Service aggregates the
    user\'s activity into a personalized summary.

7\. Deployment & Operational Considerations (Conceptual)

7.1 Deployment Topology

Each core service (Storage & Streaming, Recommendation, LLM Explanation,
Playlist/Collaboration, Activity Logging, Monthly Wrap, Metadata
Enrichment) is deployable as an independently scalable unit --- whether
implemented as separate processes/services or as modules within a shared
backend --- so that recommendation or explanation load does not compete
with core playback traffic. The specific deployment model (e.g.,
containers, managed services) is left open pending the technology-stack
decision noted in the PRD.

7.2 Scheduling

The Daily ML Training Job runs on a fixed daily schedule (e.g., during
low-traffic hours) and publishes a new model version without
interrupting live recommendation serving.

7.3 Resilience

-   If the Recommendation Service is unavailable, the system falls back
    to a simpler queue (e.g., recently popular songs) rather than
    blocking playback.

-   If the LLM Explanation Service is unavailable, recommended songs are
    still shown without an explanation rather than withholding the
    recommendation.

-   If an external enrichment source (ReccoBeats/FreqBlog, Discogs) is
    unavailable, playback proceeds using whatever attributes/metadata
    are already available, with enrichment retried later.

7.4 Observability

-   Cache-hit rate (songs served from stored File ID vs. new external
    fetch) should be tracked as a core storage-efficiency metric.

-   Daily training job success/failure and resulting model version
    should be logged and monitored.

-   Latency of song resolution, recommendation generation, and
    explanation generation should be tracked against the NFR targets
    defined in the SRS.

8\. Traceability to Requirements

The table below maps major architectural components to the functional
requirement groups they fulfil, as defined in the SRS.

  -----------------------------------------------------------------------
  **Component**                        **Related SRS Requirements**
  ------------------------------------ ----------------------------------
  Authentication & Session Service     FR-1.x

  Storage & Streaming Service          FR-2.x

  Metadata & Audio-Feature Enrichment  FR-2.10 -- FR-2.13
  Service                              

  Recommendation Service (ML)          FR-3.x

  LLM Explanation Service              FR-3.3, FR-3.4

  Playlist & Collaboration Service     FR-4.x, FR-5.x

  Client --- Lyrics View               FR-6.x

  Activity Logging Service             FR-7.x

  Daily ML Training Job                FR-8.x

  Monthly Wrap Service                 FR-9.x
  -----------------------------------------------------------------------

9\. Open Architectural Decisions

-   Final backend/frontend technology stack and hosting/deployment
    model.

-   Whether core services are deployed as independent microservices or
    as modules within a monolithic backend for MVP.

-   Choice of ML serving infrastructure and LLM provider/hosting for the
    explanation service.

-   Long-term suitability and limits of Telegram-based audio storage at
    scale, and a possible migration path to dedicated object storage if
    needed.
