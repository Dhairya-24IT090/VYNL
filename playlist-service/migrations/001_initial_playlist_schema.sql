CREATE SCHEMA IF NOT EXISTS playlist;

CREATE TABLE IF NOT EXISTS playlist.playlists (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    is_collaborative BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playlist.playlist_items (
    id UUID PRIMARY KEY,
    playlist_id UUID NOT NULL REFERENCES playlist.playlists(id) ON DELETE CASCADE,
    song_id UUID NOT NULL,
    position TEXT COLLATE "C" NOT NULL,
    added_by UUID NOT NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_playlist_position UNIQUE(playlist_id, position)
);

CREATE TABLE IF NOT EXISTS playlist.playlist_collaborators (
    playlist_id UUID NOT NULL REFERENCES playlist.playlists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (playlist_id, user_id)
);

CREATE TABLE IF NOT EXISTS playlist.playlist_invites (
    id UUID PRIMARY KEY,
    playlist_id UUID NOT NULL REFERENCES playlist.playlists(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
    created_by UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_by UUID,
    redeemed_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS playlist.activity_outbox (
    event_id UUID PRIMARY KEY,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_pos ON playlist.playlist_items(playlist_id, position COLLATE "C");
CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_user ON playlist.playlist_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_outbox_unsent ON playlist.activity_outbox(created_at) WHERE sent_at IS NULL;
