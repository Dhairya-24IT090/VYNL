import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/apiClient";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import { ListMusic, Plus, Trash2, Play, Shuffle, Loader2 } from "lucide-react";

export const PlaylistsPage = () => {
  const { isAuthenticated } = useAuth();
  const { playPlaylist } = usePlayer();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);

  const fetchPlaylists = () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
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
  };

  useEffect(() => {
    fetchPlaylists();
  }, [isAuthenticated]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const pl = await api.post("/v1/playlists/", { name: name.trim() });
      if (pl && pl.playlist_id) {
        setPlaylists((prev) => [pl, ...prev.filter((p) => p.playlist_id !== pl.playlist_id)]);
      }
      setName("");
      setIsCreating(false);
      fetchPlaylists();
    } catch (err) {
      setError(err?.message || "Failed to create playlist.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e, playlistId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.delete(`/v1/playlists/${playlistId}`);
      setPlaylists((prev) => prev.filter((p) => p.playlist_id !== playlistId));
    } catch (err) {
      setError(err?.message || "Failed to delete playlist.");
    }
  };

  const handlePlayPlaylist = async (e, playlistId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const details = await api.get(`/v1/playlists/${playlistId}`);
      if (details.tracks && details.tracks.length > 0) {
        await playPlaylist(details.tracks, { shuffle: false });
      }
    } catch {}
  };

  const handleShufflePlaylist = async (e, playlistId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const details = await api.get(`/v1/playlists/${playlistId}`);
      if (details.tracks && details.tracks.length > 0) {
        await playPlaylist(details.tracks, { shuffle: true });
      }
    } catch {}
  };

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <h2 style={{ fontSize: "22px", color: "#FFFFFF", marginBottom: "12px" }}>
          Playlists
        </h2>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "20px" }}>
          Sign in to create and manage personal playlists.
        </p>
        <Link to="/sign-in" className="btn-glass" style={{ textDecoration: "none" }}>
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="page-playlists" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1
            className="font-display"
            style={{ fontSize: "28px", color: "#FFFFFF", marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}
          >
            <ListMusic size={26} /> Playlists
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "15px" }}>
            Curate and customize your personal track collections.
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreating((prev) => !prev);
            setError(null);
          }}
          className="btn-glass"
          style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}
        >
          <Plus size={16} /> New Playlist
        </button>
      </header>

      {error && (
        <div
          className="glass-panel"
          style={{
            padding: "12px 16px",
            borderColor: "var(--color-danger)",
            color: "var(--color-danger)",
            fontSize: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}
          >
            ×
          </button>
        </div>
      )}

      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="glass-panel"
          style={{ padding: "20px", display: "flex", gap: "12px", alignItems: "center" }}
        >
          <input
            type="text"
            placeholder="Playlist name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={creating}
            autoFocus
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              color: "#FFFFFF",
              fontSize: "14px",
            }}
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="btn-glass"
            style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            {creating ? <Loader2 size={15} className="animate-spin" /> : null}
            Create
          </button>
          <button
            type="button"
            disabled={creating}
            onClick={() => setIsCreating(false)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: "var(--color-text-tertiary)" }}>Loading playlists...</p>
      ) : playlists.length === 0 ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "16px" }}>
            You haven't created any playlists yet.
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="btn-glass"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <Plus size={15} /> Create First Playlist
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          {playlists.map((pl) => {
            const trackCount = pl.track_count || pl.tracks?.length || 0;
            return (
              <Link
                key={pl.playlist_id}
                to={`/playlists/${pl.playlist_id}`}
                className="glass-panel hover-scale"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "20px",
                  textDecoration: "none",
                  color: "#FFFFFF",
                  borderRadius: "var(--radius-card)",
                  transition: "all var(--duration-fast)",
                  justifyContent: "space-between",
                  minHeight: "140px",
                  position: "relative",
                }}
              >
                <div>
                  <div style={{ fontSize: "17px", fontWeight: 700, marginBottom: "6px", wordBreak: "break-word" }}>
                    {pl.name}
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--color-text-tertiary)" }}>
                    {trackCount} {trackCount === 1 ? "track" : "tracks"}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "16px",
                    paddingTop: "12px",
                    borderTop: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", gap: "6px" }}>
                    {trackCount > 0 && (
                      <>
                        <button
                          onClick={(e) => handlePlayPlaylist(e, pl.playlist_id)}
                          title="Play all"
                          style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid var(--color-border-subtle)",
                            borderRadius: "var(--radius-pill)",
                            color: "var(--color-accent)",
                            cursor: "pointer",
                            padding: "6px 10px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "12px",
                          }}
                        >
                          <Play size={12} fill="currentColor" /> Play
                        </button>
                        <button
                          onClick={(e) => handleShufflePlaylist(e, pl.playlist_id)}
                          title="Shuffle playlist"
                          style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid var(--color-border-subtle)",
                            borderRadius: "var(--radius-pill)",
                            color: "var(--color-accent)",
                            cursor: "pointer",
                            padding: "6px 10px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "12px",
                          }}
                        >
                          <Shuffle size={12} /> Shuffle
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, pl.playlist_id)}
                    title="Delete playlist"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--color-text-tertiary)",
                      cursor: "pointer",
                      padding: "4px",
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
