import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
  MoreHorizontal,
  ChevronDown,
  Maximize2,
  Palette,
  ArrowDownCircle,
  Music,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useLyrics } from "../hooks/useLyrics";
import { useLyricsStyle } from "../hooks/useLyricsStyle";
import { getFontById, ensureGoogleFontsLoaded } from "../config/lyricsFonts";
import { getBackgroundById } from "../config/lyricsBackgrounds";
import { findActiveLineIndex } from "../utils/lrc";
import { LyricsCustomizer } from "./LyricsCustomizer";

export const NowPlayingBar = ({
  onToggleQueue,
  isQueueOpen,
  onToggleLyrics,
  isLyricsOpen,
  onOpenFullscreenLyrics,
}) => {
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
    getAudioCurrentTime,
  } = usePlayer();

  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [userScrolledAway, setUserScrolledAway] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const optionsRef = useRef(null);
  const lyricsContainerRef = useRef(null);
  const activeLineRef = useRef(null);
  const scrollResumeTimerRef = useRef(null);
  const isProgrammaticScrollRef = useRef(false);

  const { style, updateStyle, resetToDefault, swatches } = useLyricsStyle();
  const {
    status,
    syncedLines,
    isEstimated,
    isInstrumental,
    isLoading,
  } = useLyrics(currentTrack);

  const currentFont = useMemo(() => getFontById(style.fontId), [style.fontId]);
  const currentBg = useMemo(
    () => getBackgroundById(style.backgroundId),
    [style.backgroundId]
  );

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Ensure fonts loaded when lyrics active
  useEffect(() => {
    if (isLyricsOpen) {
      ensureGoogleFontsLoaded();
    }
  }, [isLyricsOpen]);

  // High-performance time tracking with requestAnimationFrame for inline lyrics
  useEffect(() => {
    if (!isLyricsOpen || syncedLines.length === 0) {
      setActiveIndex(-1);
      return;
    }

    let animationFrameId;

    const tick = () => {
      const currentTime = getAudioCurrentTime ? getAudioCurrentTime() : progress;
      const index = findActiveLineIndex(syncedLines, currentTime);
      setActiveIndex((prev) => (prev !== index ? index : prev));
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isLyricsOpen, syncedLines, getAudioCurrentTime, progress]);

  // Smooth autoscroll to active line
  const scrollToActiveLine = useCallback(() => {
    if (activeLineRef.current && lyricsContainerRef.current) {
      isProgrammaticScrollRef.current = true;
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 500);
    }
  }, []);

  useEffect(() => {
    if (isLyricsOpen && !userScrolledAway && activeIndex >= 0) {
      scrollToActiveLine();
    }
  }, [isLyricsOpen, activeIndex, userScrolledAway, scrollToActiveLine]);

  const handleLyricsScroll = () => {
    if (isProgrammaticScrollRef.current) return;
    setUserScrolledAway(true);
    if (scrollResumeTimerRef.current) {
      clearTimeout(scrollResumeTimerRef.current);
    }
    scrollResumeTimerRef.current = setTimeout(() => {
      setUserScrolledAway(false);
    }, 3000);
  };

  const handleJumpToCurrent = () => {
    setUserScrolledAway(false);
    scrollToActiveLine();
  };

  const handleLineClick = (lineTime) => {
    if (isEstimated || status !== "synced") return;
    seek(lineTime);
  };

  // Close options menu on Escape or outside click
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOptionsOpen) {
        setIsOptionsOpen(false);
      }
    };
    const handleClickOutside = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) {
        setIsOptionsOpen(false);
      }
    };
    if (isOptionsOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOptionsOpen]);

  // Gracefully handle missing metadata fields per Task 6 [F5-7]
  const title = currentTrack?.title || "No Track Selected";
  const artist = currentTrack?.artist || "Unknown Artist";
  const album = currentTrack?.album || "";
  const coverUrl = currentTrack?.cover_url || "";
  const isLiked = !!currentTrack?.is_liked;
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const isNewRelease = Boolean(
    currentTrack?.is_new_release || currentTrack?.release_date?.startsWith?.("2026")
  );
  const likesCount = currentTrack?.likes_count || null;

  // Active Line glow style
  const glowTextShadow =
    style.glow > 0
      ? `0 0 ${style.glow * 0.2}px ${style.color}, 0 0 ${style.glow * 0.5}px ${style.color}, 0 2px 4px rgba(0, 0, 0, 0.9)`
      : "0 2px 4px rgba(0, 0, 0, 0.9)";

  return (
    <footer
      className={`now-playing-root ${isMobileExpanded ? "is-mobile-expanded" : ""} ${
        isLyricsOpen ? "lyrics-mode-active" : ""
      }`}
      data-testid="now-playing-panel"
      aria-label="Now Playing Audio Player"
    >
      {/* Mobile Expand / Collapse Bar Handle */}
      {isMobileExpanded && (
        <button
          onClick={() => setIsMobileExpanded(false)}
          aria-label="Collapse Now Playing Panel"
          className="mobile-collapse-handle-btn"
        >
          <ChevronDown size={24} />
        </button>
      )}

      {/* 1. Desktop & Mobile Expanded: Notched Cutout Top Action Cradle (when lyrics closed) */}
      {!isLyricsOpen && (
        <div className="player-top-notch-cradle">
          <div className="player-notch-btn-cluster">
            <button
              data-testid="like-button"
              onClick={() => toggleLike(currentTrack?.id)}
              aria-label={isLiked ? "Unlike Track" : "Like Track"}
              className="btn-circle player-notch-action-btn"
            >
              <Heart
                size={18}
                fill={isLiked ? "#EF4444" : "none"}
                color={isLiked ? "#EF4444" : "#FFFFFF"}
              />
            </button>

            <div style={{ position: "relative" }} ref={optionsRef}>
              <button
                onClick={() => setIsOptionsOpen((prev) => !prev)}
                aria-label="Player Options & Volume"
                aria-haspopup="true"
                aria-expanded={isOptionsOpen}
                className="btn-circle player-notch-action-btn"
              >
                <MoreHorizontal size={18} />
              </button>

              {/* Volume Popover Menu (Amendment 4) */}
              {isOptionsOpen && (
                <div
                  role="menu"
                  aria-label="Playback controls and volume"
                  className="glass-panel"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "54px",
                    zIndex: 120,
                    width: "220px",
                    padding: "16px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(20, 20, 26, 0.98)",
                    boxShadow: "var(--shadow-floating)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>
                    Volume Control
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                      {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      aria-label="Volume Slider"
                      style={{ flex: 1, accentColor: "#FFFFFF", cursor: "pointer" }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Cover Image Banner: full-bleed by default, hidden when isLyricsOpen */}
      <div
        className={`player-cover-wrap ${isLyricsOpen ? "lyrics-mode-hidden" : ""}`}
        data-testid="now-playing-cover"
        onClick={() => {
          if (window.innerWidth < 1280 && !isMobileExpanded) {
            setIsMobileExpanded(true);
          }
        }}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="player-cover-image"
          />
        ) : (
          <div className="player-cover-fallback">
            No Art
          </div>
        )}
        <div className="player-artwork-gradient-scrim" />
      </div>

      {/* 2.5. Inline Lyrics Display (Rendered below the top artwork header) */}
      {isLyricsOpen && (
        <div
          ref={lyricsContainerRef}
          onScroll={handleLyricsScroll}
          className="player-inline-lyrics-container"
          data-testid="lyrics-lines-container"
        >
          {/* Background image layer if customized or track artwork (clear by default) */}
          {(currentBg?.url || coverUrl) && (
            <img
              src={currentBg?.url || coverUrl}
              alt=""
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 0,
                filter: style.bgBlur > 0 ? `blur(${style.bgBlur}px)` : "none",
                transform: style.bgBlur > 0 ? "scale(1.04)" : "none",
                opacity: 0.5,
                pointerEvents: "none",
                transition: "filter 150ms ease, opacity 150ms ease, transform 150ms ease",
              }}
            />
          )}

          {/* Background overlay from customizer for user-controlled darkness */}
          <div
            data-testid="lyrics-bg-overlay"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: `rgba(8, 8, 12, ${style.bgOpacity / 100})`,
              zIndex: 1,
              pointerEvents: "none",
              transition: "background-color 150ms ease",
            }}
          />

          {/* Loading State */}
          {isLoading && (
            <div
              data-testid="lyrics-loading"
              className="player-inline-lyrics-state"
            >
              <div className="player-lyrics-spinner" />
              <span>Fetching lyrics...</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && status === "none" && (
            <div
              data-testid="lyrics-empty-state"
              className="player-inline-lyrics-state"
            >
              <Music size={28} opacity={0.6} />
              <span>
                {isInstrumental
                  ? "Instrumental"
                  : "No lyrics available for this track"}
              </span>
            </div>
          )}

          {/* Synced Lyrics Lines */}
          {!isLoading &&
            status !== "none" &&
            syncedLines.map((line, idx) => {
              const isActive = activeIndex === idx;
              const isClickable = !isEstimated && status === "synced";

              return (
                <div
                  key={`${line.time}-${idx}`}
                  ref={isActive ? activeLineRef : null}
                  data-testid={`lyric-line-line-${idx}`}
                  onClick={() => isClickable && handleLineClick(line.time)}
                  tabIndex={isClickable ? 0 : -1}
                  onKeyDown={(e) => {
                    if (isClickable && (e.key === "Enter" || e.key === " ")) {
                      handleLineClick(line.time);
                    }
                  }}
                  className={`player-inline-lyric-line ${isActive ? "active" : ""}`}
                  style={{
                    fontFamily: currentFont.fallback,
                    color: isActive ? style.color : "#FFFFFF",
                    textShadow: isActive ? glowTextShadow : "0 1px 3px rgba(0, 0, 0, 0.8)",
                  }}
                >
                  {line.text}
                </div>
              );
            })}

          {/* Floating Jump to Current Button */}
          {userScrolledAway && activeIndex >= 0 && (
            <button
              onClick={handleJumpToCurrent}
              data-testid="jump-to-current-btn"
              aria-label="Jump to current playing line"
              className="player-inline-jump-btn"
            >
              <ArrowDownCircle size={14} />
              Jump to current
            </button>
          )}
        </div>
      )}

      {/* 3. Bottom Controls Panel */}
      <div className="player-bottom-controls-surface">
        {/* Optional "New release" Badge */}
        {isNewRelease && !isLyricsOpen && (
          <div className="player-new-release-tag">New release</div>
        )}

        {/* Metadata Stack (Visible when not in lyrics mode, or compact in lyrics mode) */}
        {!isLyricsOpen && (
          <div
            className="player-metadata-container"
            onClick={() => {
              if (window.innerWidth < 1280 && !isMobileExpanded) {
                setIsMobileExpanded(true);
              }
            }}
          >
            <div className="player-title-text" data-testid="now-playing-title">
              {title}
            </div>
            <div className="player-artist-text" data-testid="now-playing-artist">
              {artist}
              {album ? <span style={{ color: "var(--color-text-tertiary)" }}> • {album}</span> : null}
            </div>
            {likesCount ? (
              <div className="player-likes-text">
                <Heart size={12} fill="#EF4444" color="#EF4444" /> {likesCount} likes
              </div>
            ) : null}
          </div>
        )}

        {/* In lyrics mode: Song title & artist on left, Action cluster on right directly above the scrubber */}
        {isLyricsOpen && (
          <div className="player-lyrics-bottom-meta-row">
            <div className="player-lyrics-track-info">
              <div className="player-lyrics-meta-title" data-testid="now-playing-title">
                {title}
              </div>
              <div className="player-lyrics-meta-artist" data-testid="now-playing-artist">
                {artist}
                {album ? <span> • {album}</span> : null}
              </div>
            </div>

            <div className="player-lyrics-meta-actions">
              <button
                data-testid="like-button"
                onClick={() => toggleLike(currentTrack?.id)}
                aria-label={isLiked ? "Unlike Track" : "Like Track"}
                className="btn-circle player-lyrics-action-btn"
              >
                <Heart
                  size={16}
                  fill={isLiked ? "#EF4444" : "none"}
                  color={isLiked ? "#EF4444" : "#FFFFFF"}
                />
              </button>

              <button
                onClick={() => setIsCustomizerOpen(true)}
                aria-label="Customize Lyrics Theme"
                data-testid="customize-lyrics-btn"
                className="btn-circle player-lyrics-action-btn"
              >
                <Palette size={16} />
              </button>

              <button
                onClick={() => onOpenFullscreenLyrics && onOpenFullscreenLyrics()}
                aria-label="Expand Lyrics to Fullscreen"
                data-testid="expand-lyrics-btn"
                className="btn-circle player-lyrics-action-btn"
              >
                <Maximize2 size={16} />
              </button>

              <div style={{ position: "relative" }} ref={optionsRef}>
                <button
                  onClick={() => setIsOptionsOpen((prev) => !prev)}
                  aria-label="Player Options & Volume"
                  aria-haspopup="true"
                  aria-expanded={isOptionsOpen}
                  className="btn-circle player-lyrics-action-btn"
                >
                  <MoreHorizontal size={16} />
                </button>

                {isOptionsOpen && (
                  <div
                    role="menu"
                    aria-label="Playback controls and volume"
                    className="glass-panel"
                    style={{
                      position: "absolute",
                      right: 0,
                      bottom: "44px",
                      zIndex: 120,
                      width: "220px",
                      padding: "16px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "rgba(20, 20, 26, 0.98)",
                      boxShadow: "var(--shadow-floating)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>
                      Volume Control
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                        {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        aria-label="Volume Slider"
                        style={{ flex: 1, accentColor: "#FFFFFF", cursor: "pointer" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Timeline Scrubber */}
        <div className="player-timeline-block">
          <span
            data-testid="playback-progress-time"
            className="player-timestamp-label"
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
            role="slider"
            aria-label="Playback Scrubber"
            aria-valuemin={0}
            aria-valuemax={duration || 100}
            aria-valuenow={progress}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                seek(Math.min(duration, progress + 5));
              } else if (e.key === "ArrowLeft") {
                seek(Math.max(0, progress - 5));
              }
            }}
            className="player-scrubber-rail"
          >
            <div
              data-testid="scrubber-fill"
              className="player-scrubber-progress"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <span
            data-testid="playback-duration-time"
            className="player-timestamp-label text-right"
          >
            {formatTime(duration)}
          </span>
        </div>

        {/* Transport Controls Row */}
        <div className="player-transport-controls-cluster">
          {/* Left Slot: Queue Drawer Toggle */}
          <button
            onClick={onToggleQueue}
            aria-label="Toggle Playback Queue"
            className={`btn-circle player-aux-btn ${isQueueOpen ? "active" : ""}`}
            style={{
              backgroundColor: isQueueOpen ? "rgba(255, 255, 255, 0.2)" : "transparent",
              color: isQueueOpen ? "#FFFFFF" : "var(--color-text-secondary)",
            }}
          >
            <List size={20} />
          </button>

          {/* Previous Track */}
          <button
            onClick={prevTrack}
            disabled={!currentTrack}
            aria-label="Previous Track"
            className="btn-circle player-aux-btn"
          >
            <SkipBack size={22} />
          </button>

          {/* Primary Play/Pause Circle (64px white) */}
          <button
            data-testid="play-pause-button"
            onClick={togglePlay}
            disabled={!currentTrack}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="btn-circle-play player-center-play-circle"
          >
            {isPlaying ? (
              <Pause size={24} fill="#0F0F0F" color="#0F0F0F" />
            ) : (
              <Play size={24} fill="#0F0F0F" color="#0F0F0F" style={{ marginLeft: "3px" }} />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={nextTrack}
            disabled={!currentTrack}
            aria-label="Next Track"
            className="btn-circle player-aux-btn"
          >
            <SkipForward size={22} />
          </button>

          {/* Right Slot: Lyrics Panel Toggle */}
          <button
            onClick={onToggleLyrics}
            data-testid="lyrics-toggle-btn"
            aria-label="Toggle Lyrics Panel"
            className={`btn-circle player-aux-btn ${isLyricsOpen ? "active" : ""}`}
            style={{
              backgroundColor: isLyricsOpen ? "rgba(255, 255, 255, 0.2)" : "transparent",
              color: isLyricsOpen ? "#FFFFFF" : "var(--color-text-secondary)",
            }}
          >
            <Mic2 size={20} />
          </button>
        </div>
      </div>

      {/* Lyrics Customizer Modal */}
      <LyricsCustomizer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        style={style}
        updateStyle={updateStyle}
        resetToDefault={resetToDefault}
        swatches={swatches}
      />
    </footer>
  );
};

