import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Minimize2,
  Palette,
  ArrowDownCircle,
  Music,
  Heart,
  ListPlus,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useLyrics } from '../hooks/useLyrics';
import { useLyricsStyle } from '../hooks/useLyricsStyle';
import { getFontById, ensureGoogleFontsLoaded } from '../config/lyricsFonts';
import { getBackgroundById } from '../config/lyricsBackgrounds';
import { findActiveLineIndex } from '../utils/lrc';
import { LyricsCustomizer } from './LyricsCustomizer';
import { AddToPlaylistModal } from './AddToPlaylistModal';

export const LyricsPanel = ({ isOpen, onClose, overrideTrack = null }) => {
  const {
    currentTrack: contextTrack,
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

  const currentTrack = overrideTrack || contextTrack;

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [userScrolledAway, setUserScrolledAway] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef(null);
  const activeLineElementRef = useRef(null);
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

  // Selected Font & Background
  const currentFont = useMemo(() => getFontById(style.fontId), [style.fontId]);
  const currentBg = useMemo(
    () => getBackgroundById(style.backgroundId),
    [style.backgroundId]
  );

  // Ensure fonts loaded when panel opens
  useEffect(() => {
    if (isOpen) {
      ensureGoogleFontsLoaded();
    }
  }, [isOpen]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // High-performance time tracking with requestAnimationFrame
  useEffect(() => {
    if (!isOpen || syncedLines.length === 0) {
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
  }, [isOpen, syncedLines, getAudioCurrentTime, progress]);

  // Check prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Smooth autoscroll to active line
  const scrollToActiveLine = useCallback(() => {
    if (activeLineElementRef.current && containerRef.current) {
      isProgrammaticScrollRef.current = true;
      activeLineElementRef.current.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
      });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 500);
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!userScrolledAway && activeIndex >= 0) {
      scrollToActiveLine();
    }
  }, [activeIndex, userScrolledAway, scrollToActiveLine]);

  // Detect manual user scrolling and pause auto-follow for 3 seconds
  const handleScroll = () => {
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
    if (isEstimated || status !== 'synced') return;
    seek(lineTime);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!isOpen) return null;

  const isLiked = !!currentTrack?.is_liked;
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  // Build Layered Glow Style
  const glowTextShadow =
    style.glow > 0
      ? `0 0 ${style.glow * 0.2}px ${style.color}, 0 0 ${style.glow * 0.5}px ${style.color}, 0 2px 4px rgba(0, 0, 0, 0.9)`
      : '0 2px 4px rgba(0, 0, 0, 0.9)';

  return (
    <aside
      data-testid="lyrics-panel"
      className="lyrics-fullscreen-overlay lyrics-drawer-panel lyrics-fullscreen"
      aria-label="Synchronized Lyrics Fullscreen"
    >
      {/* 1. Background image / gradient layer */}
      {currentBg?.url || currentTrack?.cover_url ? (
        <img
          src={currentBg?.url || currentTrack?.cover_url}
          alt={currentBg?.label || currentTrack?.title}
          className="lyrics-fullscreen-bg-image"
          style={{
            filter: style.bgBlur > 0 ? `blur(${style.bgBlur}px)` : 'none',
            transform: style.bgBlur > 0 ? 'scale(1.04)' : 'none',
          }}
        />
      ) : (
        <div className="lyrics-fullscreen-bg-fallback" />
      )}

      {/* 2. User-controlled dark overlay */}
      <div
        data-testid="lyrics-bg-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: `rgba(8, 8, 12, ${style.bgOpacity / 100})`,
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      {/* 3. Top Header Bar */}
      <header className="lyrics-fullscreen-header">
        <div style={{ overflow: 'hidden', maxWidth: '65%' }}>
          <h2
            data-testid="lyrics-track-title"
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#FFFFFF',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              margin: 0,
            }}
          >
            {currentTrack?.title || 'No Track Selected'}
          </h2>
          <p
            data-testid="lyrics-track-artist"
            style={{
              fontSize: '13px',
              color: 'var(--color-text-secondary, #aaa)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              margin: '3px 0 0 0',
            }}
          >
            {currentTrack?.artist || 'Unknown Artist'}
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isEstimated && (
            <span
              data-testid="estimated-sync-badge"
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'var(--color-text-secondary, #ddd)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              Estimated sync
            </span>
          )}

          <button
            onClick={() => setIsCustomizerOpen((prev) => !prev)}
            aria-label="Customize Lyrics"
            data-testid="customize-lyrics-btn"
            className="btn-circle player-notch-action-btn"
            style={{ width: '42px', height: '42px' }}
          >
            <Palette size={18} />
          </button>

          <button
            onClick={onClose}
            aria-label="Exit Fullscreen"
            data-testid="expand-lyrics-btn"
            className="btn-circle player-notch-action-btn"
            style={{ width: '42px', height: '42px' }}
          >
            <Minimize2 size={18} />
          </button>

          <button
            onClick={onClose}
            aria-label="Close Lyrics"
            data-testid="close-lyrics-btn"
            className="btn-circle player-notch-action-btn"
            style={{ width: '42px', height: '42px' }}
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* 4. Fullscreen Lyrics Lines Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        data-testid="lyrics-lines-container"
        className="lyrics-fullscreen-lines-scroll"
      >
        {/* Loading State */}
        {isLoading && (
          <div
            data-testid="lyrics-loading"
            style={{
              margin: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              color: 'var(--color-text-secondary, #aaa)',
              fontSize: '15px',
            }}
          >
            <div className="player-lyrics-spinner" style={{ width: '32px', height: '32px' }} />
            Fetching lyrics...
          </div>
        )}

        {/* Empty States: Instrumental or No Lyrics */}
        {!isLoading && status === 'none' && (
          <div
            data-testid="lyrics-empty-state"
            style={{
              margin: 'auto',
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--color-text-tertiary, #888)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <Music size={40} opacity={0.6} />
            <p style={{ fontSize: '16px', margin: 0, fontWeight: 500 }}>
              {isInstrumental
                ? 'Instrumental'
                : 'No lyrics available for this track'}
            </p>
          </div>
        )}

        {/* Lyrics Lines Rendering */}
        {!isLoading &&
          status !== 'none' &&
          syncedLines.map((line, idx) => {
            const isActive = activeIndex === idx;
            const isClickable = !isEstimated && status === 'synced';

            return (
              <div
                key={`${line.time}-${idx}`}
                ref={isActive ? activeLineElementRef : null}
                data-testid={`lyric-line-line-${idx}`}
                onClick={() => isClickable && handleLineClick(line.time)}
                tabIndex={isClickable ? 0 : -1}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    handleLineClick(line.time);
                  }
                }}
                style={{
                  fontFamily: currentFont.fallback,
                  fontSize: isActive ? '36px' : '26px',
                  fontWeight: isActive ? 700 : 500,
                  lineHeight: 1.45,
                  color: isActive ? style.color : '#FFFFFF',
                  opacity: isActive ? 1 : 0.4,
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                  transformOrigin: 'left center',
                  textShadow: isActive ? glowTextShadow : '0 1px 3px rgba(0, 0, 0, 0.8)',
                  cursor: isClickable ? 'pointer' : 'default',
                  transition: prefersReducedMotion
                    ? 'none'
                    : 'transform 200ms ease, opacity 200ms ease, font-size 200ms ease',
                  userSelect: 'none',
                }}
              >
                {line.text}
              </div>
            );
          })}
      </div>

      {/* 5. "Jump to Current Line" Floating Action Button */}
      {userScrolledAway && activeIndex >= 0 && (
        <button
          onClick={handleJumpToCurrent}
          data-testid="jump-to-current-btn"
          aria-label="Jump to current playing line"
          className="player-fullscreen-jump-btn"
        >
          <ArrowDownCircle size={16} />
          Jump to current
        </button>
      )}

      {/* 6. Bottom Playback Control Cluster Bar */}
      <footer className="lyrics-fullscreen-bottom-bar">
        {/* Timeline Scrubber */}
        <div className="player-timeline-block" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
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
              if (e.key === 'ArrowRight') {
                seek(Math.min(duration, progress + 5));
              } else if (e.key === 'ArrowLeft') {
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

        {/* Playback Controls Row */}
        <div className="lyrics-fullscreen-controls-row">
          {/* Left Cluster: Favorite & Add to Playlist */}
          <div className="lyrics-fullscreen-side-cluster left">
            <button
              data-testid="like-button"
              onClick={() => toggleLike(currentTrack?.id)}
              aria-label={isLiked ? 'Unlike Track' : 'Like Track'}
              className="btn-circle player-aux-btn"
            >
              <Heart
                size={20}
                fill={isLiked ? '#EF4444' : 'none'}
                color={isLiked ? '#EF4444' : '#FFFFFF'}
              />
            </button>

            <button
              onClick={() => setIsAddToPlaylistOpen(true)}
              aria-label="Add to Playlist"
              className="btn-circle player-aux-btn"
            >
              <ListPlus size={20} />
            </button>
          </div>

          {/* Center Cluster: Prev, Play/Pause, Next */}
          <div className="lyrics-fullscreen-center-cluster">
            <button
              onClick={prevTrack}
              disabled={!currentTrack}
              aria-label="Previous Track"
              className="btn-circle player-aux-btn"
            >
              <SkipBack size={24} />
            </button>

            <button
              data-testid="play-pause-button"
              onClick={togglePlay}
              disabled={!currentTrack}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="btn-circle-play player-center-play-circle"
              style={{ width: '58px', height: '58px' }}
            >
              {isPlaying ? (
                <Pause size={24} fill="#0F0F0F" color="#0F0F0F" />
              ) : (
                <Play size={24} fill="#0F0F0F" color="#0F0F0F" style={{ marginLeft: '3px' }} />
              )}
            </button>

            <button
              onClick={nextTrack}
              disabled={!currentTrack}
              aria-label="Next Track"
              className="btn-circle player-aux-btn"
            >
              <SkipForward size={24} />
            </button>
          </div>

          {/* Right Cluster: Audio / Volume Slider */}
          <div className="lyrics-fullscreen-side-cluster right">
            <button
              onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
              aria-label={volume === 0 ? 'Unmute' : 'Mute'}
              className="btn-circle player-aux-btn"
            >
              {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              aria-label="Volume Slider"
              className="lyrics-fullscreen-volume-slider"
            />
          </div>
        </div>
      </footer>

      {/* Add To Playlist Modal */}
      {currentTrack && (
        <AddToPlaylistModal
          track={currentTrack}
          isOpen={isAddToPlaylistOpen}
          onClose={() => setIsAddToPlaylistOpen(false)}
        />
      )}

      {/* Customization Sheet */}
      <LyricsCustomizer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        style={style}
        updateStyle={updateStyle}
        resetToDefault={resetToDefault}
        swatches={swatches}
      />
    </aside>
  );
};

