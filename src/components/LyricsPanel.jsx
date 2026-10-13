import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Palette,
  ArrowDownCircle,
  Music,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useLyrics } from '../hooks/useLyrics';
import { useLyricsStyle } from '../hooks/useLyricsStyle';
import { getFontById, ensureGoogleFontsLoaded } from '../config/lyricsFonts';
import { getBackgroundById } from '../config/lyricsBackgrounds';
import { findActiveLineIndex } from '../utils/lrc';
import { LyricsCustomizer } from './LyricsCustomizer';

export const LyricsPanel = ({ isOpen, onClose, overrideTrack = null }) => {
  const { currentTrack: contextTrack, seek, getAudioCurrentTime, progress } = usePlayer();
  const currentTrack = overrideTrack || contextTrack;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
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
    plainLines,
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
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen]);

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

  if (!isOpen) return null;

  // Build Layered Glow Style
  const glowTextShadow =
    style.glow > 0
      ? `0 0 ${style.glow * 0.2}px ${style.color}, 0 0 ${style.glow * 0.5}px ${style.color}, 0 2px 4px rgba(0, 0, 0, 0.9)`
      : '0 2px 4px rgba(0, 0, 0, 0.9)';

  const panelStyles = isFullscreen
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        width: '100vw',
        height: '100vh',
        borderRadius: 0,
      }
    : {
        position: 'fixed',
        right: '20px',
        bottom: '110px',
        width: 'min(460px, calc(100vw - 40px))',
        height: 'calc(100vh - 140px)',
        maxHeight: '680px',
        zIndex: 90,
        borderRadius: 'var(--radius-lg, 16px)',
      };

  return (
    <aside
      data-testid="lyrics-panel"
      className="glass-panel"
      style={{
        ...panelStyles,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-floating, 0 16px 36px rgba(0, 0, 0, 0.6))',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        transition: prefersReducedMotion ? 'none' : 'all 250ms ease',
      }}
      aria-label="Synchronized Lyrics"
    >
      {/* 1. Background image layer */}
      {currentBg?.url ? (
        <img
          src={currentBg.url}
          alt={currentBg.label}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1,
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(20, 20, 30, 0.96) 0%, rgba(10, 10, 14, 0.98) 100%)',
            zIndex: 1,
          }}
        />
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

      {/* 3. Panel Header */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ overflow: 'hidden', maxWidth: '65%' }}>
          <h2
            data-testid="lyrics-track-title"
            style={{
              fontSize: '14px',
              fontWeight: 600,
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
              fontSize: '12px',
              color: 'var(--color-text-secondary, #aaa)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              margin: '2px 0 0 0',
            }}
          >
            {currentTrack?.artist || 'Unknown Artist'}
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isEstimated && (
            <span
              data-testid="estimated-sync-badge"
              style={{
                fontSize: '10px',
                padding: '3px 7px',
                borderRadius: '10px',
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
            style={{
              background: isCustomizerOpen
                ? 'rgba(255, 255, 255, 0.15)'
                : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: isCustomizerOpen ? '#FFFFFF' : 'var(--color-text-secondary, #aaa)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Palette size={18} />
          </button>

          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
            data-testid="expand-lyrics-btn"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--color-text-secondary, #aaa)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          <button
            onClick={onClose}
            aria-label="Close Lyrics"
            data-testid="close-lyrics-btn"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--color-text-secondary, #aaa)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* 4. Lyrics Lines Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        data-testid="lyrics-lines-container"
        style={{
          position: 'relative',
          zIndex: 10,
          flex: 1,
          overflowY: 'auto',
          padding: isFullscreen ? '40px 60px' : '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: isFullscreen ? '24px' : '18px',
          scrollBehavior: prefersReducedMotion ? 'auto' : 'smooth',
        }}
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
              fontSize: '13px',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderTopColor: '#FFFFFF',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
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
              gap: '12px',
            }}
          >
            <Music size={32} opacity={0.6} />
            <p style={{ fontSize: '14px', margin: 0, fontWeight: 500 }}>
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
                  fontSize: isActive
                    ? isFullscreen
                      ? '34px'
                      : '22px'
                    : isFullscreen
                      ? '26px'
                      : '17px',
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
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '24px',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: 'var(--radius-pill, 9999px)',
            backgroundColor: 'rgba(20, 20, 26, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <ArrowDownCircle size={15} />
          Jump to current
        </button>
      )}

      {/* 6. Customization Sheet */}
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
