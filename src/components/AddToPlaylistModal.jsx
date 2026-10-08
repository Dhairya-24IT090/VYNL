import React, { useEffect, useState } from "react";
import { api } from "../services/apiClient";
import { X, Plus, Check } from "lucide-react";

export const AddToPlaylistModal = ({ track, isOpen, onClose }) => {
  const [playlists, setPlaylists] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [addedIds, setAddedIds] = useState(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api
      .get("/v1/playlists/")
      .then((data) => setPlaylists(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen || !track) return null;

  const trackId = track.track_id || track.id;

  const handleAddToPlaylist = async (playlistId) => {
    try {
      await api.post(`/v1/playlists/${playlistId}/tracks`, { track_id: trackId });
      setAddedIds((prev) => new Set([...prev, playlistId]));
    } catch {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const created = await api.post("/v1/playlists/", { name: newTitle.trim() });
      setPlaylists((prev) => [created, ...prev]);
      setNewTitle("");
      if (created.playlist_id) {
        await handleAddToPlaylist(created.playlist_id);
      }
    } catch {} finally {
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
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "24px",
          backgroundColor: "rgba(22, 22, 26, 0.95)",
          boxShadow: "var(--shadow-floating)",
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

        <form
          onSubmit={handleCreate}
          style={{ display: "flex", gap: "8px", marginBottom: "16px" }}
        >
          <input
            type="text"
            placeholder="New playlist name..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
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
            style={{ padding: "8px 14px", fontSize: "13px" }}
          >
            <Plus size={15} /> Create
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
              return (
                <button
                  key={pl.playlist_id}
                  onClick={() => handleAddToPlaylist(pl.playlist_id)}
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
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>
                    {pl.name}
                  </span>
                  {isAdded && <Check size={16} color="var(--color-success)" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
