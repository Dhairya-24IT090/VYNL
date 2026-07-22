# Software Requirements Specification (SRS) — VYNL

## 1. Introduction
This document specifies the technical requirements for the VYNL platform, a microservices-based music streaming and social discovery application.

## 2. Functional Requirements

### 2.1 Recommendation & Curation (FR1-FR4)
- **FR1:** The system must generate track suggestions based on genre and artist similarity vectors.
- **FR2:** Users must be able to initiate "Auto-Generation" by seeding a playlist with a specific genre or artist.
- **FR3:** The system must update user taste profiles in near real-time based on likes, skips, and replay events.
- **FR4:** Each recommendation must include an `explanation_tag` derived from the similarity signal.

### 2.2 Streaming & Playback (FR5-FR7)
- **FR5:** Support EAC-3 high-quality streaming and local caching for offline playback.
- **FR6:** Implement adaptive bitrate switching to maintain playback under varying network conditions.
- **FR7:** Support "Handoff" — continuing a session from web to mobile or vice-versa.

### 2.3 Collaborative Playlists (FR8-FR10)
- **FR8:** Concurrent multi-user editing of playlist tracks and metadata.
- **FR9:** Use Ypy (CRDT) to resolve merge conflicts without a central lock.
- **FR10:** Real-time presence indicators (e.g., "User X is listening", "User Y is editing").

### 2.4 Community & Discussion (FR11-FR13)
- **FR11:** Global and genre-specific persistent chat channels.
- **FR12:** Threaded discussions pinned to specific tracks or public playlists.
- **FR13:** Support for rich interactions (mentions, emojis, and replies).

### 2.5 Lyrics & Personalization (FR14-FR15)
- **FR14:** Synchronized lyric display matching the audio playback timestamp.
- **FR15:** Extensible template system for users to design and share custom lyric overlays.

### 2.6 Identity & Security (FR16-FR18)
- **FR16:** Secure registration via Email/Password and OAuth2 (Google/Apple).
- **FR17:** Persistent storage of user listening history and "Taste Vectors".
- **FR18:** Granular privacy settings (e.g., Private Sessions, Hidden Playlists).

## 3. Non-Functional Requirements

### 3.1 Performance
- **Latency:** Recommendation API response < 200ms (p95).
- **Audio Start:** Playback buffer filled and started in < 1s.

### 3.2 Scalability & Availability
- **Architecture:** Independently scalable microservices via Docker.
- **Uptime:** 99.9% target for core Streaming and Auth services.

### 3.3 Reliability & Security
- **Data Integrity:** No lost edits in collaborative sessions (CRDT guarantee).
- **Encryption:** TLS 1.3 for all traffic; AES-256 for data at rest.

### 3.4 Constraints
- **Infrastructure:** Must run on a single Oracle Cloud Always-Free VM (4 OCPU ARM, 24 GB RAM).
- **Storage:** Audio files must be proxied via Telegram to avoid storage costs.
