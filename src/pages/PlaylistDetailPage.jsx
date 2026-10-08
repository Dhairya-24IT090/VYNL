import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../services/apiClient";
import { usePlayer } from "../context/PlayerContext";
import { Play, Trash2, ArrowLeft } from "lucide-react";

export const PlaylistDetailPage = () => {
  const { id } = useParams();
  const { playTrack } = usePlayer();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api
      .get(`/v1/playlists/${id}`)
      .then((data) => {
        if (isMounted) setPlaylist(data);
      })
      .catch((err) => {
        if (isMounted) setError("Failed to load playlist.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handlePlayTrack = async (track) => {
    let audioUrl = track.audio_url;
    const trackId = track.track_id || track.id;
    if (!audioUrl) {
      try {
        const res = await api.get(`/api/v1/tracks/${trackId}/stream-link`);
        audioUrl = res.stream_url;
      } catch {}
    }
    const playable = {
      id: trackId,
      track_id: trackId,
      title: track.title,
      artist: track.artist,
      duration_seconds: track.duration_seconds || 0,
      cover_url: track.cover_url,
      audio_url: audioUrl,
    };
    playTrack(playable);
  };

  const handleRemoveTrack = async (trackId) => {
    try {
      await api.delete(`/v1/playlists/${id}/tracks/${trackId}`);
      setPlaylist((prev) => ({
        ...prev,
        tracks: prev.tracks.filter((t) => (t.track_id || t.id) !== trackId),
        track_count: Math.max(0, (prev.track_count || 1) - 1),
      }));
    } catch {}
  };

  if (loading) {
    return <p style={{ color: "var(--color-text-tertiary)", padding: "40px" }}>Loading playlist...</p>;
  }

  if (error || !playlist) {
    return (
      <div style={{ padding: "40px 20px" }}>
        <p style={{ color: "var(--color-danger)", marginBottom: "16px" }}>{error || "Playlist not found."}</p>
        <Link to="/playlists" className="btn-glass" style={{ textDecoration: "none" }}>
          Back to Playlists
        </Link>
      </div>
    );
  }

  const tracks = playlist.tracks || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <Link
        to="/playlists"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          color: "var(--color-text-secondary)",
          textDecoration: "none",
          fontSize: "14px",
        }}
      >
        <ArrowLeft size={16} /> Back to Playlists
      </Link>

      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 className="font-display" style={{ fontSize: "32px", color: "#FFFFFF", marginBottom: "8px" }}>
            {playlist.name}
          </h1>
          <p style={{ color: "var(--color-text-tertiary)", fontSize: "14px" }}>
            {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
          </p>
        </div>

        {tracks.length > 0 && (
          <button
            onClick={() => handlePlayTrack(tracks[0])}
            className="btn-glass"
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px" }}
          >
            <Play size={16} fill="currentColor" /> Play All
          </button>
        )}
      </header>

      {tracks.length === 0 ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-secondary)" }}>This playlist is empty.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {tracks.map((track, idx) => {
              const trackId = track.track_id || track.id;
              return (
                <div
                  key={trackId || idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                    <span style={{ color: "var(--color-text-tertiary)", fontSize: "13px", width: "20px" }}>
                      {idx + 1}
                    </span>
                    <button
                      onClick={() => handlePlayTrack(track)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--color-accent)",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                      title="Play"
                    >
                      <Play size={15} fill="currentColor" />
                    </button>
                    <div style={{ overflow: "hidden" }}>
                      <div style={{ color: "#FFFFFF", fontSize: "14px", fontWeight: 600, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {track.title || "Track"}
                      </div>
                      <div style={{ color: "var(--color-text-tertiary)", fontSize: "12px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {track.artist || "Unknown Artist"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveTrack(trackId)}
                    title="Remove from playlist"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--color-text-tertiary)",
                      cursor: "pointer",
                      padding: "6px",
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
