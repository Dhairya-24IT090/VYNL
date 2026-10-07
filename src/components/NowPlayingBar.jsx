/**
 * Now Playing Bar & Metadata Panel per Task 4 [F3-18], Task 6 [F5-7], and Task 39 [F18-2].
 * Sticky glass player rendering track metadata with fallback defaults for missing fields,
 * transport controls, interactive scrubber, and drawer toggles.
 */
import React from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Mic2,
  List,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";

export const NowPlayingBar = ({ onToggleQueue, isQueueOpen }) => {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    togglePlay,
    seek,
    setVolume,
    nextTrack,
    prevTrack,
    toggleLike,
  } = usePlayer();

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Gracefully handle missing metadata fields per Task 6 [F5-7]
  const title = currentTrack?.title || "No Track Selected";
  const artist = currentTrack?.artist || "Unknown Artist";
  const album = currentTrack?.album || "";
  const coverUrl = currentTrack?.cover_url || "";
  const isLiked = !!currentTrack?.is_liked;
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <footer
      className="glass-panel"
      style={{
        position: "fixed",
        bottom: "16px",
        left: "20px",
        right: "20px",
        height: "84px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        zIndex: 100,
        backgroundColor: "rgba(18, 18, 22, 0.88)",
      }}
      aria-label="Now Playing Bar"
    >
      {/* 1. Now Playing Metadata Panel (Task 6 [F5-7]) */}
      <div
        data-testid="now-playing-panel"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          width: "280px",
          minWidth: "200px",
        }}
      >
        <div
          data-testid="now-playing-cover"
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "1px solid var(--color-border)",
          }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span
              style={{ fontSize: "10px", color: "var(--color-text-tertiary)" }}
            >
              No Art
            </span>
          )}
        </div>

        <div style={{ overflow: "hidden" }}>
          <div
            data-testid="now-playing-title"
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#FFFFFF",
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
          <div
            data-testid="now-playing-artist"
            style={{
              fontSize: "12px",
              color: "var(--color-text-secondary)",
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
              marginTop: "2px",
            }}
          >
            {artist}
            {album && (
              <span style={{ color: "var(--color-text-tertiary)" }}>
                {" "}
                • {album}
              </span>
            )}
          </div>
        </div>

        {currentTrack && (
          <button
            data-testid="like-button"
            onClick={() => toggleLike(currentTrack.id)}
            aria-label={isLiked ? "Unlike Track" : "Like Track"}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: isLiked ? "#EF4444" : "var(--color-text-tertiary)",
              padding: "6px",
              display: "flex",
              alignItems: "center",
              transition:
                "transform var(--duration-fast), color var(--duration-fast)",
            }}
          >
            <Heart size={18} fill={isLiked ? "#EF4444" : "none"} />
          </button>
        )}
      </div>

      {/* 2. Transport & Scrubber Center Controls */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          flex: 1,
          maxWidth: "560px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={prevTrack}
            disabled={!currentTrack}
            aria-label="Previous Track"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              padding: "6px",
            }}
          >
            <SkipBack size={18} />
          </button>

          <button
            data-testid="play-pause-button"
            onClick={togglePlay}
            disabled={!currentTrack}
            aria-label={isPlaying ? "Pause" : "Play"}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              backgroundColor: "#FFFFFF",
              color: "#0F0F0F",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform var(--duration-fast)",
            }}
          >
            {isPlaying ? (
              <Pause size={18} fill="#0F0F0F" />
            ) : (
              <Play size={18} fill="#0F0F0F" style={{ marginLeft: "2px" }} />
            )}
          </button>

          <button
            onClick={nextTrack}
            disabled={!currentTrack}
            aria-label="Next Track"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              padding: "6px",
            }}
          >
            <SkipForward size={18} />
          </button>
        </div>

        {/* Scrubber Progress Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "100%",
          }}
        >
          <span
            data-testid="playback-progress-time"
            style={{
              fontSize: "11px",
              color: "var(--color-text-tertiary)",
              width: "32px",
              textAlign: "right",
            }}
          >
            {formatTime(progress)}
          </span>

          <div
            data-testid="scrubber-container"
            onClick={(e) => {
              if (duration <= 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = (e.clientX - rect.left) / rect.width;
              seek(pos * duration);
            }}
            style={{
              flex: 1,
              height: "5px",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              borderRadius: "var(--radius-pill)",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              data-testid="scrubber-fill"
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                backgroundColor: "#FFFFFF",
                borderRadius: "var(--radius-pill)",
                transition: "width 100ms linear",
              }}
            />
          </div>

          <span
            data-testid="playback-duration-time"
            style={{
              fontSize: "11px",
              color: "var(--color-text-tertiary)",
              width: "32px",
            }}
          >
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* 3. Right Panel Utility Controls (Lyrics, Queue, Volume) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          width: "280px",
          justifyContent: "flex-end",
        }}
      >
        <Link
          to="/lyrics"
          title="Open Synchronized Lyrics"
          aria-label="Lyrics"
          style={{
            color: "var(--color-text-secondary)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            padding: "6px",
          }}
        >
          <Mic2 size={18} />
        </Link>

        {onToggleQueue && (
          <button
            onClick={onToggleQueue}
            aria-label="Toggle Playback Queue"
            style={{
              background: "transparent",
              border: "none",
              color: isQueueOpen ? "#FFFFFF" : "var(--color-text-secondary)",
              cursor: "pointer",
              padding: "6px",
            }}
          >
            <List size={18} />
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
            aria-label={volume === 0 ? "Unmute" : "Mute"}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            {volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            aria-label="Volume Slider"
            style={{
              width: "76px",
              accentColor: "#FFFFFF",
              cursor: "pointer",
            }}
          />
        </div>
      </div>
    </footer>
  );
};
