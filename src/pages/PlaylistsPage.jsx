import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/apiClient";
import { useAuth } from "../context/AuthContext";
import { ListMusic, Plus, Trash2 } from "lucide-react";

export const PlaylistsPage = () => {
  const { isAuthenticated } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");

  const fetchPlaylists = () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    api
      .get("/v1/playlists/")
      .then((data) => setPlaylists(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlaylists();
  }, [isAuthenticated]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const pl = await api.post("/v1/playlists/", { name: name.trim() });
      setPlaylists((prev) => [pl, ...prev]);
      setName("");
      setIsCreating(false);
    } catch {}
  };

  const handleDelete = async (e, playlistId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.delete(`/v1/playlists/${playlistId}`);
      setPlaylists((prev) => prev.filter((p) => p.playlist_id !== playlistId));
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
          onClick={() => setIsCreating((prev) => !prev)}
          className="btn-glass"
          style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}
        >
          <Plus size={16} /> New Playlist
        </button>
      </header>

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
          <button type="submit" className="btn-glass" style={{ padding: "10px 20px" }}>
            Create
          </button>
          <button
            type="button"
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
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {playlists.map((pl) => (
            <Link
              key={pl.playlist_id}
              to={`/playlists/${pl.playlist_id}`}
              className="glass-panel"
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "20px",
                textDecoration: "none",
                color: "#FFFFFF",
                borderRadius: "var(--radius-card)",
                transition: "transform var(--duration-fast)",
                justifyContent: "space-between",
                minHeight: "130px",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "6px" }}>
                  {pl.name}
                </div>
                <div style={{ fontSize: "13px", color: "var(--color-text-tertiary)" }}>
                  {pl.track_count || pl.tracks?.length || 0} tracks
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
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
          ))}
        </div>
      )}
    </div>
  );
};
