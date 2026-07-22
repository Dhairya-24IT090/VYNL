# Database Design — VYNL

## 1. Storage Overview
VYNL utilizes a multi-model database strategy to optimize for different access patterns while remaining within the free-tier constraints of various providers.

## 2. Relational Schema (PostgreSQL - Neon.tech)

### 2.1 User Management
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    display_name VARCHAR(100),
    oauth_provider VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    favorite_genres TEXT[], -- Array of genre IDs
    explicit_content_allowed BOOLEAN DEFAULT FALSE,
    theme VARCHAR(20) DEFAULT 'dark'
);
```

### 2.2 Music Catalog
```sql
CREATE TABLE artists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    image_url VARCHAR(512)
);

CREATE TABLE tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    artist_id UUID REFERENCES artists(id),
    genre_id VARCHAR(50),
    duration_ms INTEGER,
    audio_file_id VARCHAR(255) -- Telegram File ID
);
```

## 3. Document Store (MongoDB - Atlas)

### 3.1 Discussion Hub
```json
// Collection: threads
{
  "_id": "ObjectId",
  "type": "genre | song | playlist",
  "target_id": "string",
  "title": "string",
  "created_by": "UUID",
  "created_at": "ISODate"
}

// Collection: messages
{
  "_id": "ObjectId",
  "thread_id": "ObjectId",
  "user_id": "UUID",
  "content": "string",
  "reactions": [
    { "user_id": "UUID", "emoji": "string" }
  ],
  "created_at": "ISODate"
}
```

## 4. Vector Store (FAISS - In-memory/Local)

### 4.1 Recommendation Engine
- **Index Type:** `IndexFlatIP` (Inner Product for cosine similarity).
- **Vectors:** 128-dimensional embeddings for tracks and users.
- **Storage:** Local binary files (`faiss_index/tracks.index`) reloaded into memory on service startup.

## 5. Analytics Store (ClickHouse - Self-hosted)

### 5.1 Event Logs
```sql
CREATE TABLE listening_events (
    event_id UUID,
    user_id UUID,
    track_id UUID,
    event_type Enum8('play'=1, 'skip'=2, 'like'=3, 'replay'=4),
    timestamp DateTime64(3, 'UTC'),
    session_id UUID
) ENGINE = MergeTree()
ORDER BY (timestamp, user_id);
```

## 6. Cache & Event Bus (Redis)
- **Shared Cache:** Hot track metadata and session data.
- **Redis Streams:**
    - `listening.events`: Consumed by Analytics and ML services.
    - `playlist.events`: Consumed by Notification service.
