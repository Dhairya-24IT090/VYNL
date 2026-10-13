import { useState, useEffect, useRef } from 'react';
import { api } from '../services/apiClient';
import { parseLrc, estimatePlainLyricsSync } from '../utils/lrc';
import { isEnglishLyrics } from '../utils/lyricsLanguage';

// In-memory per-track session cache
const sessionCache = new Map();

export function useLyrics(currentTrack) {
  const [lyricsData, setLyricsData] = useState({
    status: 'none', // 'synced' | 'plain' | 'none'
    syncedLines: [],
    plainLines: [],
    isEstimated: false,
    isInstrumental: false,
    isLoading: false,
    error: null,
  });

  const abortControllerRef = useRef(null);
  const currentReqTokenRef = useRef(0);

  useEffect(() => {
    if (!currentTrack || (!currentTrack.title && !currentTrack.id)) {
      setLyricsData({
        status: 'none',
        syncedLines: [],
        plainLines: [],
        isEstimated: false,
        isInstrumental: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    const title = currentTrack.title || '';
    const artist = currentTrack.artist || '';
    const album = currentTrack.album || '';
    const duration = currentTrack.duration || currentTrack.duration_seconds || 0;
    const trackId = currentTrack.id || currentTrack.track_id || '';

    // If track already has an embedded LRC string (e.g. test tracks or custom files)
    if (currentTrack.lyrics && typeof currentTrack.lyrics === 'string') {
      const parsed = parseLrc(currentTrack.lyrics);
      if (parsed.length > 0) {
        setLyricsData({
          status: 'synced',
          syncedLines: parsed,
          plainLines: parsed.map((p) => p.text),
          isEstimated: false,
          isInstrumental: false,
          isLoading: false,
          error: null,
        });
        return;
      }
    }

    const cacheKey = `${trackId || title}|${artist}|${Math.round(duration)}`;
    if (sessionCache.has(cacheKey)) {
      setLyricsData(sessionCache.get(cacheKey));
      return;
    }

    // Cancel previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const requestToken = ++currentReqTokenRef.current;

    setLyricsData((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    const queryParams = new URLSearchParams();
    if (title) queryParams.set('title', title);
    if (artist) queryParams.set('artist', artist);
    if (album) queryParams.set('album', album);
    if (duration) queryParams.set('duration', String(duration));
    if (trackId) queryParams.set('track_id', trackId);

    api
      .get(`/v1/lyrics?${queryParams.toString()}`, {
        signal: abortController.signal,
      })
      .then((data) => {
        if (requestToken !== currentReqTokenRef.current) return;

        let status = data?.status || 'none';
        let syncedLines = data?.synced_lines || [];
        let plainLines = data?.plain_lines || [];
        const isInstrumental = Boolean(data?.is_instrumental);
        let isEstimated = false;

        // Client-side language check safeguard
        if (status !== 'none' && !isInstrumental) {
          const sampleText =
            syncedLines.map((l) => l.text).join(' ') || plainLines.join(' ');
          if (sampleText && !isEnglishLyrics(sampleText)) {
            status = 'none';
            syncedLines = [];
            plainLines = [];
          }
        }

        // If only plain lyrics exist, generate estimated timestamps
        if (status === 'plain' && plainLines.length > 0) {
          syncedLines = estimatePlainLyricsSync(plainLines, duration);
          isEstimated = true;
        }

        const resolved = {
          status,
          syncedLines,
          plainLines,
          isEstimated,
          isInstrumental,
          isLoading: false,
          error: null,
        };

        sessionCache.set(cacheKey, resolved);
        setLyricsData(resolved);
      })
      .catch((err) => {
        if (err.name === 'AbortError' || abortController.signal.aborted) {
          return;
        }
        if (requestToken !== currentReqTokenRef.current) return;

        const fallback = {
          status: 'none',
          syncedLines: [],
          plainLines: [],
          isEstimated: false,
          isInstrumental: false,
          isLoading: false,
          error: err.message || 'Failed to fetch lyrics',
        };
        setLyricsData(fallback);
      });

    return () => {
      abortController.abort();
    };
  }, [currentTrack]);

  return lyricsData;
}
