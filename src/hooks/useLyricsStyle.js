import { useState, useEffect, useCallback } from 'react';
import { LYRICS_FONTS, DEFAULT_FONT_ID } from '../config/lyricsFonts';
import { getBackgroundById, DEFAULT_BACKGROUND } from '../config/lyricsBackgrounds';

const STORAGE_KEY = 'vynl.lyricsStyle.v1';

export const DEFAULT_LYRICS_STYLE = {
  backgroundId: 'default',
  fontId: DEFAULT_FONT_ID,
  color: '#FFFFFF',
  glow: 40,
  bgOpacity: 65,
};

export const COLOR_SWATCHES = [
  '#FFFFFF',
  '#A78BFA', // Purple
  '#60A5FA', // Blue
  '#34D399', // Emerald
  '#F472B6', // Pink
  '#FBBF24', // Amber
  '#FB7185', // Rose
  '#38BDF8', // Sky
];

function sanitizeStyle(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_LYRICS_STYLE };
  }

  // Validate font
  const hasFont = LYRICS_FONTS.some((f) => f.id === raw.fontId);
  const fontId = hasFont ? raw.fontId : DEFAULT_FONT_ID;

  // Validate background
  const bg = getBackgroundById(raw.backgroundId);
  const backgroundId = bg ? bg.id : DEFAULT_BACKGROUND.id;

  // Validate color
  const color =
    typeof raw.color === 'string' && raw.color.trim() ? raw.color.trim() : '#FFFFFF';

  // Clamp glow (0 - 100)
  const numGlow = Number(raw.glow);
  const glow = isNaN(numGlow) ? 40 : Math.max(0, Math.min(100, Math.round(numGlow)));

  // Clamp bgOpacity (0 - 100)
  const numOpacity = Number(raw.bgOpacity);
  const bgOpacity = isNaN(numOpacity)
    ? 65
    : Math.max(0, Math.min(100, Math.round(numOpacity)));

  return {
    backgroundId,
    fontId,
    color,
    glow,
    bgOpacity,
  };
}

export function loadStoredStyle() {
  if (typeof window === 'undefined') return { ...DEFAULT_LYRICS_STYLE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LYRICS_STYLE };
    const parsed = JSON.parse(raw);
    return sanitizeStyle(parsed);
  } catch {
    return { ...DEFAULT_LYRICS_STYLE };
  }
}

export function saveStoredStyle(style) {
  if (typeof window === 'undefined') return;
  try {
    const sanitized = sanitizeStyle(style);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // Gracefully handle storage quota or private browsing exceptions
  }
}

export function useLyricsStyle() {
  const [style, setStyleState] = useState(() => loadStoredStyle());

  const updateStyle = useCallback((updates) => {
    setStyleState((prev) => {
      const next = sanitizeStyle({ ...prev, ...updates });
      saveStoredStyle(next);
      return next;
    });
  }, []);

  const resetToDefault = useCallback(() => {
    const def = { ...DEFAULT_LYRICS_STYLE };
    setStyleState(def);
    saveStoredStyle(def);
  }, []);

  return {
    style,
    updateStyle,
    resetToDefault,
    swatches: COLOR_SWATCHES,
  };
}
