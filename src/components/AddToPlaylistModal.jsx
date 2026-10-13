import React, { useEffect, useState } from "react";
import { api } from "../services/apiClient";
import { X, Plus, Check, Loader2 } from "lucide-react";

export const AddToPlaylistModal = ({ track, isOpen, onClose }) => {
  const [playlists, setPlaylists] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [addedIds, setAddedIds] = useState(new Set());
  const [creating, setCreating] = useState(false);
  const [addingToId, setAddingToId] = useState(null);
  const [error, setError] = useState(null);
  const [isSwooshing, setIsSwooshing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSwooshing(false);
      return;
    }
    setIsSwooshing(false);
    setLoading(true);
    setError(null);
    api
      .get("/v1/playlists/")
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.playlists || []);
        setPlaylists(list);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load playlists.");
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen || !track) return null;

  const resolveTrack = async (targetTrack) => {
    let resolvedId = targetTrack.track_id || targetTrack.id;
    if (resolvedId) return resolvedId;

    if (targetTrack.apple_track_id || (targetTrack.title && targetTrack.artist)) {
      try {
        const ingestRes = await fetch("/api/v1/tracks/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: targetTrack.title,
            artist: targetTrack.artist,
            apple_track_id: targetTrack.apple_track_id,
            apple_music_url: targetTrack.apple_music_url,
          }),
        });
        if (ingestRes.ok) {
          const ingestData = await ingestRes.json();
          if (ingestData?.track_id) {
            targetTrack.track_id = ingestData.track_id;
            return ingestData.track_id;
          }
        }
      } catch {}
    }
    return null;
  };

  const handleAddToPlaylist = async (playlistId) => {
    setAddingToId(playlistId);
    setError(null);
    try {
      const resolvedId = await resolveTrack(track);
      if (!resolvedId) {
        throw new Error("Could not prepare track for playlist.");
      }
      await api.post(`/v1/playlists/${playlistId}/tracks`, {
        track_id: resolvedId,
        title: track.title,
        artist: track.artist,
        cover_url: track.cover_url || track.artwork_url,
        duration_seconds:
          track.duration_seconds ||
          (track.duration_ms ? Math.round(track.duration_ms / 1000) : 0),
      });
      setAddedIds((prev) => new Set([...prev, playlistId]));
      setIsSwooshing(true);
      setTimeout(() => {
        onClose();
        setIsSwooshing(false);
      }, 600);
    } catch (err) {
      setError(err?.message || "Failed to add track to playlist.");
    } finally {
      setAddingToId(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const created = await api.post("/v1/playlists/", { name: newTitle.trim() });
      if (created && created.playlist_id) {
        setPlaylists((prev) => [
          created,
          ...prev.filter((p) => p.playlist_id !== created.playlist_id),
        ]);
        setNewTitle("");
        await handleAddToPlaylist(created.playlist_id);
      }
    } catch (err) {
      setError(err?.message || "Failed to create playlist.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "20px",
        opacity: isSwooshing ? 0 : 1,
        transition: "opacity 500ms ease",
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        data-testid="add-to-playlist-dialog"
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "24px",
          backgroundColor: "rgba(22, 22, 26, 0.95)",
          boxShadow: isSwooshing
            ? "0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 25px rgba(255, 255, 255, 0.15)"
            : "var(--shadow-floating)",
          transform: isSwooshing
            ? "translateY(-32px) scale(0.92)"
            : "translateY(0) scale(1)",
          opacity: isSwooshing ? 0 : 1,
          filter: isSwooshing ? "blur(4px)" : "none",
          transition:
            "transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 500ms ease, filter 500ms ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#FFFFFF" }}>
            Add to Playlist
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p
          style={{
            fontSize: "13px",
            color: "var(--color-text-tertiary)",
            marginBottom: "16px",
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          "{track.title}" by {track.artist}
        </p>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "var(--color-danger)",
              fontSize: "12px",
              marginBottom: "12px",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleCreate}
          style={{ display: "flex", gap: "8px", marginBottom: "16px" }}
        >
          <input
            type="text"
            placeholder="New playlist name..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={creating}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              color: "#FFFFFF",
              fontSize: "13px",
            }}
          />
          <button
            type="submit"
            disabled={creating || !newTitle.trim()}
            className="btn-glass"
            style={{
              padding: "8px 14px",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
            Create
          </button>
        </form>

        <div
          style={{
            maxHeight: "220px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {loading ? (
            <p style={{ color: "var(--color-text-tertiary)", fontSize: "13px" }}>
              Loading playlists...
            </p>
          ) : playlists.length === 0 ? (
            <p style={{ color: "var(--color-text-tertiary)", fontSize: "13px" }}>
              No playlists found. Create one above!
            </p>
          ) : (
            playlists.map((pl) => {
              const isAdded = addedIds.has(pl.playlist_id);
              const isAdding = addingToId === pl.playlist_id;
              return (
                <button
                  key={pl.playlist_id}
                  onClick={() => handleAddToPlaylist(pl.playlist_id)}
                  disabled={isAdding}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: isAdded
                      ? "var(--color-surface-glass-active)"
                      : "transparent",
                    border: "1px solid var(--color-border-subtle)",
                    color: "#FFFFFF",
                    cursor: isAdding ? "default" : "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>
                    {pl.name}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {isAdding && <Loader2 size={14} className="animate-spin" />}
                    {isAdded && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "12px",
                          color: "var(--color-accent)",
                        }}
                      >
                        <Check size={14} /> Added
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
