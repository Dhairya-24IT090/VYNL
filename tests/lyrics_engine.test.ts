import { describe, it, expect, beforeEach } from 'vitest';
import { parseLrc, estimatePlainLyricsSync, findActiveLineIndex } from '../src/utils/lrc';
import { isEnglishLyrics } from '../src/utils/lyricsLanguage';
import {
  loadStoredStyle,
  saveStoredStyle,
  DEFAULT_LYRICS_STYLE,
} from '../src/hooks/useLyricsStyle';

describe('LRC Parser Engine', () => {
  it('parses standard timestamp formats and drops metadata tags', () => {
    const lrc = `
      [ti:Song Title]
      [ar:Artist Name]
      [al:Album Name]
      [00:04.50]First line of lyrics
      [01:12.75]Second line with millisecond precision
    `;
    const parsed = parseLrc(lrc);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].time).toBe(4.5);
    expect(parsed[0].text).toBe('First line of lyrics');
    expect(parsed[1].time).toBe(72.75);
    expect(parsed[1].text).toBe('Second line with millisecond precision');
  });

  it('handles multi-timestamp lines correctly', () => {
    const lrc = `[00:10.00][00:20.00]Chorus line repeated`;
    const parsed = parseLrc(lrc);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].time).toBe(10.0);
    expect(parsed[0].text).toBe('Chorus line repeated');
    expect(parsed[1].time).toBe(20.0);
    expect(parsed[1].text).toBe('Chorus line repeated');
  });

  it('applies [offset: ...] tags and handles 3-digit millisecond fractions', () => {
    const lrc = `
      [offset:500]
      [00:05.200]Offset line
    `;
    const parsed = parseLrc(lrc);
    expect(parsed).toHaveLength(1);
    // 5.2s + 0.5s offset = 5.7s
    expect(parsed[0].time).toBe(5.7);
    expect(parsed[0].text).toBe('Offset line');
  });

  it('ignores malformed lines and empty strings gracefully', () => {
    const malformed = `
      Not an LRC timestamp line
      [999:999] Invalid
      []
      [00:02.00]
      
    `;
    const parsed = parseLrc(malformed);
    expect(parsed).toEqual([]);
    expect(parseLrc('')).toEqual([]);
    expect(parseLrc(null)).toEqual([]);
  });
});

describe('Plain Lyrics Sync Estimation', () => {
  it('generates strictly monotonic timestamps within duration bounds', () => {
    const plain = [
      'Short line',
      'This is a much longer line with multiple syllables and words',
      'Medium length line',
      'Outro',
    ];
    const duration = 120;
    const estimated = estimatePlainLyricsSync(plain, duration);

    expect(estimated).toHaveLength(4);
    // Intro buffer should start around ~8% of duration (9.6s)
    expect(estimated[0].time).toBeGreaterThanOrEqual(9.0);

    for (let i = 1; i < estimated.length; i++) {
      expect(estimated[i].time).toBeGreaterThan(estimated[i - 1].time);
    }

    // Last timestamp must not exceed track duration
    expect(estimated[estimated.length - 1].time).toBeLessThan(duration);
  });

  it('handles empty lines as short pauses without crashing', () => {
    const plain = ['Verse one', '', 'Verse two'];
    const estimated = estimatePlainLyricsSync(plain, 100);
    expect(estimated).toHaveLength(2);
    expect(estimated[1].time).toBeGreaterThan(estimated[0].time);
  });
});

describe('Active Line Binary Search', () => {
  const sampleLines = [
    { time: 5.0, text: 'Line 0' },
    { time: 12.5, text: 'Line 1' },
    { time: 24.0, text: 'Line 2' },
    { time: 35.0, text: 'Line 3' },
  ];

  it('returns -1 before the first timestamp', () => {
    expect(findActiveLineIndex(sampleLines, 0)).toBe(-1);
    expect(findActiveLineIndex(sampleLines, 4.9)).toBe(-1);
  });

  it('finds exact and intermediate line timestamps', () => {
    expect(findActiveLineIndex(sampleLines, 5.0)).toBe(0);
    expect(findActiveLineIndex(sampleLines, 10.0)).toBe(0);
    expect(findActiveLineIndex(sampleLines, 12.5)).toBe(1);
    expect(findActiveLineIndex(sampleLines, 20.0)).toBe(1);
    expect(findActiveLineIndex(sampleLines, 24.0)).toBe(2);
  });

  it('handles seeking backwards and end-of-track boundaries', () => {
    expect(findActiveLineIndex(sampleLines, 35.0)).toBe(3);
    expect(findActiveLineIndex(sampleLines, 100.0)).toBe(3);
    // Seeking backwards
    expect(findActiveLineIndex(sampleLines, 6.0)).toBe(0);
  });
});

describe('English / Latin-Script Filter', () => {
  it('accepts standard English and Latin-alphabet text', () => {
    expect(isEnglishLyrics('Hello darkness my old friend')).toBe(true);
    expect(isEnglishLyrics("C'est la vie, rendez-vous à la plage")).toBe(true);
    expect(isEnglishLyrics('Viva la vida, amor y pasión')).toBe(true);
  });

  it('rejects text when non-Latin characters exceed 15%', () => {
    // Hindi / Devanagari
    expect(isEnglishLyrics('तू ही मेरी मंज़िल है')).toBe(false);
    // Gujarati
    expect(isEnglishLyrics('મારું મન મોહી ગયું')).toBe(false);
    // Arabic
    expect(isEnglishLyrics('مرحبا بك في العالم')).toBe(false);
    // CJK
    expect(isEnglishLyrics('晴れた日の青い空')).toBe(false);
  });

  it('returns false on empty or invalid inputs', () => {
    expect(isEnglishLyrics('')).toBe(false);
    expect(isEnglishLyrics('123456 !@#$%')).toBe(false);
    expect(isEnglishLyrics(null)).toBe(false);
  });
});

describe('LocalStorage Style Persistence & Clamping', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when localStorage is empty', () => {
    const style = loadStoredStyle();
    expect(style.fontId).toBe(DEFAULT_LYRICS_STYLE.fontId);
    expect(style.glow).toBe(DEFAULT_LYRICS_STYLE.glow);
    expect(style.bgOpacity).toBe(DEFAULT_LYRICS_STYLE.bgOpacity);
  });

  it('clamps glow and opacity values between 0 and 100', () => {
    saveStoredStyle({
      fontId: 'caveat',
      glow: 150, // Out of bounds
      bgOpacity: -20, // Out of bounds
      color: '#A78BFA',
      backgroundId: 'default',
    });

    const loaded = loadStoredStyle();
    expect(loaded.glow).toBe(100);
    expect(loaded.bgOpacity).toBe(0);
    expect(loaded.color).toBe('#A78BFA');
  });

  it('falls back to default font if an invalid fontId is stored', () => {
    saveStoredStyle({
      fontId: 'invalid-nonexistent-font',
      glow: 30,
      bgOpacity: 50,
      color: '#FFFFFF',
    });

    const loaded = loadStoredStyle();
    expect(loaded.fontId).toBe(DEFAULT_LYRICS_STYLE.fontId);
  });
});
