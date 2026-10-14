import React, { useState, useRef, useEffect } from "react";
import { Play, Heart, MoreHorizontal, Plus, Radio, ListPlus, Trash2, Loader2 } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/apiClient";
import { AddToPlaylistModal } from "./AddToPlaylistModal";

export const TrackRow = ({
  track,
  index = 0,
  onRemove,
  onRemoveFromLibrary,
  showRemove = false,
}) => {
  const { playTrack, addToQueue, currentTrack } = usePlayer();
  const { isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState(Boolean(track.is_liked || track.saved));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef(null);

  const trackId = track.track_id || track.id;
  const isCurrent =
    currentTrack && (currentTrack.id === trackId || currentTrack.track_id === trackId);

  // Close menu on click outside or Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

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
      cover_url: track.cover_url || track.artwork_url,
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
    setIsMenuOpen(false);
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
    setIsMenuOpen(false);
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

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) {
      if (track.duration_ms) {
        seconds = Math.round(track.duration_ms / 1000);
      } else {
        return "3:30";
      }
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <>
      <div
        className={`track-row ${isCurrent ? "is-active" : ""}`}
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
        data-testid={`track-row-${trackId}`}
      >
        {/* Left side: Artwork & Titles */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            paddingRight: "16px",
          }}
        >
          <div style={{ position: "relative", flexShrink: 0 }}>
            <img
              src={
                track.cover_url ||
                track.artwork_url ||
                `https://api.dicebear.com/7.x/shapes/svg?seed=${trackId}`
              }
              alt={track.title}
              className="track-artwork-circle"
              loading="lazy"
            />
            {isCurrent && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  backgroundColor: "rgba(0, 0, 0, 0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" color="#FFFFFF" />
                ) : (
                  <Play size={16} fill="#FFFFFF" color="#FFFFFF" />
                )}
              </div>
            )}
          </div>

          <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
            <div className="track-row-title">{track.title}</div>
            <div className="track-row-artist">{track.artist || "Unknown Artist"}</div>
          </div>
        </div>

        {/* Right side: Duration & Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexShrink: 0,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="track-row-time">
            {formatDuration(track.duration_seconds)}
          </span>

          {/* Circular Heart button */}
          <button
            onClick={handleToggleLike}
            data-testid={`like-btn-${trackId}`}
            aria-label={isLiked ? "Unlike track" : "Like track"}
            className="btn-circle"
            style={{
              width: "48px",
              height: "48px",
              color: isLiked ? "#EF4444" : "rgba(255, 255, 255, 0.8)",
            }}
          >
            <Heart size={16} fill={isLiked ? "#EF4444" : "none"} />
          </button>

          {/* Circular Options '...' Button */}
          <div style={{ position: "relative" }} ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Track options menu"
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              className="btn-circle"
              style={{ width: "48px", height: "48px" }}
            >
              <MoreHorizontal size={18} />
            </button>

            {/* Accessible Role Menu */}
            {isMenuOpen && (
              <div
                role="menu"
                aria-label="Track actions"
                className="glass-panel"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "54px",
                  zIndex: 80,
                  width: "190px",
                  padding: "8px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(20, 20, 26, 0.98)",
                  boxShadow: "var(--shadow-floating)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <button
                  role="menuitem"
                  onClick={handleQueue}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    width: "100%",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <Plus size={15} /> Add to Queue
                </button>

                {isAuthenticated && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsPlaylistModalOpen(true);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      width: "100%",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <ListPlus size={15} /> Add to Playlist
                  </button>
                )}

                <button
                  role="menuitem"
                  onClick={handleStartRadio}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    width: "100%",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <Radio size={15} /> Track Radio
                </button>

                {showRemove && onRemove && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onRemove(trackId);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--color-danger)",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      width: "100%",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "var(--color-danger-glass)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <Trash2 size={15} /> Remove
                  </button>
                )}
              </div>
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
