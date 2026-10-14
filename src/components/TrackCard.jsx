import React, { useState } from "react";
import { Play, Plus, Heart, Radio, ListPlus, Loader2 } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/apiClient";
import { AddToPlaylistModal } from "./AddToPlaylistModal";

export const TrackCard = ({
  track,
  onRemoveFromLibrary,
  variant = "standard", // "standard" | "fanned"
  fannedClass = "",     // "fanned-card-left" | "fanned-card-mid" | "fanned-card-right"
}) => {
  const { playTrack, addToQueue, currentTrack } = usePlayer();
  const { isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState(Boolean(track.is_liked || track.saved));
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const trackId = track.track_id || track.id;
  const isCurrent =
    currentTrack && (currentTrack.id === trackId || currentTrack.track_id === trackId);

  const coverUrl =
    track.cover_url ||
    track.artwork_url ||
    `https://api.dicebear.com/7.x/shapes/svg?seed=${trackId}`;

  // Helper to resolve stream link if missing
  const ensureStreamable = async () => {
    if (track.audio_url) return track;
    const res = await api.get(`/api/v1/tracks/${trackId}/stream-link`);
    return {
      id: trackId,
      track_id: trackId,
      title: track.title,
      artist: track.artist,
      duration_seconds:
        track.duration_seconds || Math.round((track.duration_ms || 0) / 1000),
      audio_url: res.stream_url,
      cover_url: coverUrl,
    };
  };

  const handlePlay = async (e) => {
    if (e) e.stopPropagation();
    setIsLoading(true);
    try {
      const playable = await ensureStreamable();
      playTrack(playable);
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const handleQueue = async (e) => {
    if (e) e.stopPropagation();
    setIsLoading(true);
    try {
      const playable = await ensureStreamable();
      addToQueue(playable);
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const handleToggleLike = async (e) => {
    if (e) e.stopPropagation();
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
    if (e) e.stopPropagation();
    setIsLoading(true);
    try {
      const res = await api.get(`/v1/recommendations/radio/${trackId}`);
      if (res.recommendations && res.recommendations.length > 0) {
        const playableSeed = await ensureStreamable();
        playTrack(playableSeed, [
          playableSeed,
          ...res.recommendations.map((r) => ({
            ...r,
            id: r.track_id || r.id,
          })),
        ]);
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  // Only render metadata when genuine data exists (Amendment 2)
  const isNewRelease = Boolean(track.is_new_release || track.release_date?.startsWith?.("2026"));
  const metaParts = [];
  if (track.album_type || track.album) metaParts.push(track.album_type || track.album);
  if (track.release_year) metaParts.push(track.release_year);
  if (track.track_count) metaParts.push(`${track.track_count} Songs`);
  const metaSubtitle = metaParts.join(" • ");

  if (variant === "fanned") {
    return (
      <>
        <div
          className={`fanned-card ${fannedClass} notched-card-wrapper`}
          data-testid={`fanned-card-${trackId}`}
          onClick={handlePlay}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handlePlay();
            }
          }}
          style={{ cursor: "pointer" }}
        >
          {/* Concave Notched Cutout Media */}
          <div
            className="notched-cutout"
            style={{ width: "100%", height: "100%", position: "relative" }}
          >
            <img
              src={coverUrl}
              alt={track.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              loading="lazy"
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, 0.85) 100%)",
              }}
            />
          </div>

          {/* Top Notch Circular Heart Button */}
          <button
            onClick={handleToggleLike}
            className="notch-cradle-btn"
            aria-label={isLiked ? "Unlike track" : "Like track"}
            data-testid={`fanned-like-btn-${trackId}`}
          >
            <Heart
              size={15}
              fill={isLiked ? "#EF4444" : "rgba(255, 255, 255, 0.8)"}
              color={isLiked ? "#EF4444" : "#FFFFFF"}
            />
          </button>

          {/* "New release" badge if applicable */}
          {isNewRelease && (
            <div
              style={{
                position: "absolute",
                top: "14px",
                left: "14px",
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(8px)",
                borderRadius: "var(--radius-badge)",
                padding: "4px 10px",
                fontSize: "10px",
                color: "#FFFFFF",
                fontWeight: 500,
                zIndex: 10,
              }}
            >
              New release
            </div>
          )}

          {/* Bottom Glass Scrim with Metadata & Play Button */}
          <div className="fanned-card-scrim">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                gap: "10px",
              }}
            >
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div
                  style={{
                    fontSize: "var(--text-card-title)",
                    fontWeight: 600,
                    color: "#FFFFFF",
                    textTransform: "uppercase",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.25,
                  }}
                >
                  {track.title}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--color-text-subtle)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: "2px",
                  }}
                >
                  {track.artist}
                </div>
                {metaSubtitle ? (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "rgba(255, 255, 255, 0.7)",
                      marginTop: "3px",
                    }}
                  >
                    {metaSubtitle}
                  </div>
                ) : null}
              </div>

              <button
                onClick={handlePlay}
                disabled={isLoading}
                aria-label={`Play ${track.title}`}
                className="btn-circle-play"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" color="#0F0F0F" />
                ) : (
                  <Play
                    size={20}
                    fill="#0F0F0F"
                    color="#0F0F0F"
                    style={{ marginLeft: "2px" }}
                  />
                )}
              </button>
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
  }

  // Standard Card Layout with Modern Large Radius
  return (
    <>
      <div
        className="glass-card"
        data-testid={`track-card-${trackId}`}
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius-card)",
          overflow: "hidden",
          transition: "transform var(--duration-fast), border-color var(--duration-fast)",
          position: "relative",
          border: isCurrent
            ? "1px solid var(--color-accent)"
            : "1px solid var(--color-border-subtle)",
          backgroundColor: isCurrent
            ? "var(--color-surface-glass-active)"
            : "var(--color-surface-card)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "1 / 1",
            backgroundColor: "rgba(0, 0, 0, 0.3)",
          }}
        >
          <img
            src={coverUrl}
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
              aria-label={`Play ${track.title}`}
              className="btn-circle-play"
              style={{ width: "46px", height: "46px" }}
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" color="#0F0F0F" />
              ) : (
                <Play size={18} fill="#0F0F0F" style={{ marginLeft: "2px" }} />
              )}
            </button>
            <button
              onClick={handleQueue}
              title="Add to queue"
              aria-label={`Queue ${track.title}`}
              className="btn-circle"
              style={{ width: "38px", height: "38px" }}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: "15px",
              color: "#FFFFFF",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {track.title}
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--color-text-tertiary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {track.artist}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "8px",
              paddingTop: "8px",
              borderTop: "1px solid var(--color-divider)",
            }}
          >
            <div style={{ display: "flex", gap: "6px" }}>
              {isAuthenticated && (
                <button
                  onClick={handleToggleLike}
                  title={isLiked ? "Saved to Library" : "Save to Library"}
                  aria-label={isLiked ? "Unlike track" : "Like track"}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: isLiked ? "#EF4444" : "var(--color-text-tertiary)",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  <Heart
                    size={16}
                    fill={isLiked ? "#EF4444" : "none"}
                    color={isLiked ? "#EF4444" : "currentColor"}
                  />
                </button>
              )}
              <button
                onClick={handleStartRadio}
                title="Start Track Radio"
                aria-label="Start Track Radio"
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
                aria-label="Add to Playlist"
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
