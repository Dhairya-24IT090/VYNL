import React, { useState } from "react";
import { Play, Plus, Heart, Radio, ListPlus } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/apiClient";
import { AddToPlaylistModal } from "./AddToPlaylistModal";

export const TrackCard = ({ track, onRemoveFromLibrary }) => {
  const { playTrack, addToQueue, currentTrack } = usePlayer();
  const { isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState(Boolean(track.is_liked || track.saved));
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const trackId = track.track_id || track.id;
  const isCurrent = currentTrack && (currentTrack.id === trackId || currentTrack.track_id === trackId);

  // Helper to resolve stream link if missing
  const ensureStreamable = async () => {
    if (track.audio_url) return track;
    const res = await api.get(`/api/v1/tracks/${trackId}/stream-link`);
    return {
      id: trackId,
      track_id: trackId,
      title: track.title,
      artist: track.artist,
      duration_seconds: track.duration_seconds || Math.round((track.duration_ms || 0) / 1000),
      audio_url: res.stream_url,
      cover_url: track.cover_url || track.artwork_url,
    };
  };

  const handlePlay = async (e) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      const playable = await ensureStreamable();
      playTrack(playable);
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const handleQueue = async (e) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      const playable = await ensureStreamable();
      addToQueue(playable);
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const handleToggleLike = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) return;
    const nextState = !isLiked;
    setIsLiked(nextState);
    try {
      if (nextState) {
        await api.post("/v1/library/tracks", { track_id: trackId });
      } else {
        await api.delete(`/v1/library/tracks/${trackId}`);
        if (onRemoveFromLibrary) onRemoveFromLibrary(trackId);
      }
    } catch {
      setIsLiked(!nextState);
    }
  };

  const handleStartRadio = async (e) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      const res = await api.get(`/v1/recommendations/radio/${trackId}`);
      if (res.recommendations && res.recommendations.length > 0) {
        const playableSeed = await ensureStreamable();
        playTrack(playableSeed, [playableSeed, ...res.recommendations.map(r => ({
          ...r,
          id: r.track_id || r.id,
        }))]);
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        className="glass-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          transition: "transform var(--duration-fast), border-color var(--duration-fast)",
          position: "relative",
          border: isCurrent ? "1px solid var(--color-accent)" : "1px solid var(--color-border-subtle)",
          backgroundColor: isCurrent ? "var(--color-surface-glass-active)" : "var(--color-surface-glass)",
        }}
      >
        <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", backgroundColor: "rgba(0,0,0,0.3)" }}>
          <img
            src={track.cover_url || track.artwork_url || "https://api.dicebear.com/7.x/shapes/svg?seed=" + trackId}
            alt={track.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              opacity: isCurrent ? 1 : 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              transition: "opacity var(--duration-fast)",
            }}
            className="hover-overlay"
            onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
            onMouseLeave={(e) => {
              if (!isCurrent) e.currentTarget.style.opacity = 0;
            }}
          >
            <button
              onClick={handlePlay}
              disabled={isLoading}
              title="Play"
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                backgroundColor: "var(--color-accent)",
                color: "#0F0F0F",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <Play size={20} fill="#0F0F0F" style={{ marginLeft: "2px" }} />
            </button>
            <button
              onClick={handleQueue}
              title="Add to queue"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                color: "#FFFFFF",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                backdropFilter: "blur(6px)",
              }}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ fontWeight: 600, fontSize: "14px", color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {track.title}
          </div>
          <div style={{ fontSize: "12px", color: "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {track.artist}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              {isAuthenticated && (
                <button
                  onClick={handleToggleLike}
                  title={isLiked ? "Saved to Library" : "Save to Library"}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: isLiked ? "var(--color-accent)" : "var(--color-text-tertiary)",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  <Heart size={16} fill={isLiked ? "var(--color-accent)" : "none"} />
                </button>
              )}
              <button
                onClick={handleStartRadio}
                title="Start Track Radio"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-text-tertiary)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <Radio size={16} />
              </button>
            </div>

            {isAuthenticated && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaylistModalOpen(true);
                }}
                title="Add to Playlist"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-text-tertiary)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <ListPlus size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <AddToPlaylistModal
        track={track}
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
      />
    </>
  );
};
