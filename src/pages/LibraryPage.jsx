import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/apiClient";
import { useAuth } from "../context/AuthContext";
import { TrackCard } from "../components/TrackCard";
import { Heart, Compass } from "lucide-react";

export const LibraryPage = () => {
  const { isAuthenticated } = useAuth();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let isMounted = true;
    api
      .get("/v1/library/")
      .then((data) => {
        if (isMounted) setTracks(data.tracks || []);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleRemoveTrack = (trackId) => {
    setTracks((prev) => prev.filter((t) => (t.track_id || t.id) !== trackId));
  };

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <h2 style={{ fontSize: "22px", color: "#FFFFFF", marginBottom: "12px" }}>
          Your Library
        </h2>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "20px" }}>
          Sign in to view and manage your liked tracks.
        </p>
        <Link to="/sign-in" className="btn-glass" style={{ textDecoration: "none" }}>
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="page-library" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <header>
        <h1
          className="font-display"
          style={{
            fontSize: "28px",
            color: "#FFFFFF",
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Heart size={26} fill="var(--color-accent)" /> Liked Tracks
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "15px" }}>
          {tracks.length} {tracks.length === 1 ? "track" : "tracks"} saved to your library.
        </p>
      </header>

      {loading ? (
        <p style={{ color: "var(--color-text-tertiary)" }}>Loading library...</p>
      ) : tracks.length === 0 ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "16px" }}>
            You haven't saved any tracks yet.
          </p>
          <Link
            to="/discover"
            className="btn-glass"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Compass size={15} /> Discover Music
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "16px",
          }}
        >
          {tracks.map((track) => (
            <TrackCard
              key={track.track_id || track.id}
              track={{ ...track, saved: true, is_liked: true }}
              onRemoveFromLibrary={handleRemoveTrack}
            />
          ))}
        </div>
      )}
    </div>
  );
};
