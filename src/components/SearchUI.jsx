/**
 * Search UI — calls the streaming API for real search + ingest + stream playback.
 * Flow: search → display results → on Play: ingest → stream-link → playTrack()
 */
import React, { useState, useEffect, useRef, useContext } from "react";
import { Search, Play, Plus, Loader2, RotateCcw, ListPlus } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { AuthContext } from "../context/AuthContext";
import { AddToPlaylistModal } from "./AddToPlaylistModal";

export const SearchUI = ({ onSearchQuery }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingTrackId, setLoadingTrackId] = useState(null);
  const [playlistTrack, setPlaylistTrack] = useState(null);

  const { playTrack, addToQueue } = usePlayer();
  const auth = useContext(AuthContext);
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const timerRef = useRef(null);

  const executeSearch = async (query) => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (onSearchQuery) {
      try {
        const data = await onSearchQuery(query);
        setResults(data || []);
      } catch (err) {
        setError(err?.message || "Search service temporarily unavailable");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const params = new URLSearchParams({ title: query });
      const res = await fetch(`/api/v1/tracks/search?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `Search failed (${res.status})`);
      }
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(err?.message || "Search service temporarily unavailable");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce: 250ms pause before firing request
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (searchTerm.trim()) {
      timerRef.current = setTimeout(() => {
        executeSearch(searchTerm);
      }, 250);
    } else {
      setResults([]);
      setError(null);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [searchTerm]);

  const handleRetry = () => {
    executeSearch(searchTerm);
  };

  /** Ingest track → get stream-link → play via PlayerContext */
  const handlePlay = async (result) => {
    setLoadingTrackId(result.apple_track_id);
    try {
      // 1. Ingest (will dedup if already stored)
      const ingestRes = await fetch("/api/v1/tracks/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.title,
          artist: result.artist,
          apple_track_id: result.apple_track_id,
          apple_music_url: result.apple_music_url,
        }),
      });
      if (!ingestRes.ok) {
        const body = await ingestRes.json().catch(() => null);
        throw new Error(body?.detail || `Ingest failed (${ingestRes.status})`);
      }
      const ingestData = await ingestRes.json();

      // 2. Get stream link
      const linkRes = await fetch(
        `/api/v1/tracks/${ingestData.track_id}/stream-link`,
      );
      if (!linkRes.ok) {
        const body = await linkRes.json().catch(() => null);
        throw new Error(
          body?.detail || `Stream link failed (${linkRes.status})`,
        );
      }
      const linkData = await linkRes.json();

      // 3. Build Track and play
      const track = {
        id: ingestData.track_id,
        title: result.title,
        artist: result.artist,
        duration_seconds: Math.round(result.duration_ms / 1000),
        audio_url: linkData.stream_url,
        cover_url: result.artwork_url,
      };
      playTrack(track);
    } catch (err) {
      setError(err?.message || "Failed to play track");
    } finally {
      setLoadingTrackId(null);
    }
  };

  /** Queue shortcut — same ingest flow but addToQueue instead */
  const handleQueue = async (result) => {
    setLoadingTrackId(result.apple_track_id);
    try {
      const ingestRes = await fetch("/api/v1/tracks/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.title,
          artist: result.artist,
          apple_track_id: result.apple_track_id,
          apple_music_url: result.apple_music_url,
        }),
      });
      if (!ingestRes.ok) {
        const body = await ingestRes.json().catch(() => null);
        throw new Error(body?.detail || `Ingest failed (${ingestRes.status})`);
      }
      const ingestData = await ingestRes.json();

      const linkRes = await fetch(
        `/api/v1/tracks/${ingestData.track_id}/stream-link`,
      );
      if (!linkRes.ok) {
        const body = await linkRes.json().catch(() => null);
        throw new Error(
          body?.detail || `Stream link failed (${linkRes.status})`,
        );
      }
      const linkData = await linkRes.json();

      const track = {
        id: ingestData.track_id,
        title: result.title,
        artist: result.artist,
        duration_seconds: Math.round(result.duration_ms / 1000),
        audio_url: linkData.stream_url,
        cover_url: result.artwork_url,
      };
      addToQueue(track);
    } catch (err) {
      setError(err?.message || "Failed to queue track");
    } finally {
      setLoadingTrackId(null);
    }
  };

  const formatDuration = (ms) => {
    const totalSec = Math.round(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div style={{ width: "100%", maxWidth: "720px", margin: "0 auto" }}>
      {/* Search Input Bar */}
      <div style={{ position: "relative", marginBottom: "28px" }}>
        <input
          data-testid="search-input"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search tracks, artists, albums..."
          className="input-glass"
          style={{
            paddingLeft: "52px",
            paddingRight: "44px",
            height: "54px",
            fontSize: "15px",
            borderRadius: "var(--radius-pill)",
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            backdropFilter: "var(--backdrop-blur-dock)",
            WebkitBackdropFilter: "var(--backdrop-blur-dock)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
          }}
          aria-label="Search"
        />

        <Search
          size={20}
          style={{
            position: "absolute",
            left: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--color-text-tertiary)",
            pointerEvents: "none",
          }}
        />

        {isLoading && (
          <Loader2
            size={18}
            className="animate-spin"
            data-testid="search-loading"
            style={{
              position: "absolute",
              right: "20px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-tertiary)",
            }}
          />
        )}
      </div>

      {/* Error State */}
      {error && (
        <div
          data-testid="search-error-state"
          className="glass-panel"
          style={{
            padding: "20px 24px",
            borderRadius: "var(--radius-card)",
            borderColor: "var(--color-danger)",
            backgroundColor: "var(--color-danger-glass)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <div>
            <div
              style={{ fontWeight: 600, color: "#FFFFFF", fontSize: "14px" }}
            >
              Search Error
            </div>
            <div
              style={{
                color: "rgba(255, 255, 255, 0.75)",
                fontSize: "13px",
                marginTop: "3px",
              }}
            >
              {error}
            </div>
          </div>
          <button
            data-testid="search-retry-button"
            onClick={handleRetry}
            className="btn-primary"
            style={{ padding: "8px 18px", fontSize: "13px" }}
          >
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Search Results in Glass Panel with 84px Track Rows */}
      {results.length > 0 && (
        <div
          data-testid="search-results-list"
          className="glass-panel"
          style={{
            borderRadius: "var(--radius-panel)",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            overflow: "hidden",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {results.map((result) => {
            const trackKey = result.apple_track_id || result.id;
            const isTrackLoading = loadingTrackId === trackKey;
            return (
              <div
                key={trackKey}
                data-testid={`search-result-${trackKey}`}
                className="track-row"
                style={{
                  opacity: isTrackLoading ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: "84px",
                  padding: "0 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    flex: 1,
                    overflow: "hidden",
                    paddingRight: "16px",
                  }}
                >
                  <img
                    src={
                      result.artwork_url ||
                      `https://api.dicebear.com/7.x/shapes/svg?seed=${result.apple_track_id}`
                    }
                    alt={result.title}
                    className="track-artwork-circle"
                    loading="lazy"
                  />
                  <div style={{ overflow: "hidden", flex: 1 }}>
                    <div className="track-row-title">{result.title}</div>
                    <div className="track-row-artist">{result.artist}</div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flexShrink: 0,
                  }}
                >
                  <span className="track-row-time">
                    {formatDuration(result.duration_ms)}
                  </span>

                  <button
                    data-testid={`play-search-${result.apple_track_id}`}
                    onClick={() => handlePlay(result)}
                    disabled={isTrackLoading}
                    className="btn-glass"
                    style={{
                      padding: "8px 16px",
                      fontSize: "13px",
                      borderRadius: "var(--radius-pill)",
                      gap: "6px",
                    }}
                    aria-label={`Play ${result.title}`}
                  >
                    {isTrackLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Play size={14} fill="#FFFFFF" />
                    )}{" "}
                    Play
                  </button>

                  <button
                    onClick={() => handleQueue(result)}
                    disabled={isTrackLoading}
                    className="btn-circle"
                    style={{ width: "42px", height: "42px" }}
                    aria-label={`Queue ${result.title}`}
                    title="Add to queue"
                  >
                    <Plus size={16} />
                  </button>

                  {isAuthenticated && (
                    <button
                      data-testid={`add-playlist-search-${result.apple_track_id}`}
                      onClick={() => setPlaylistTrack(result)}
                      disabled={isTrackLoading}
                      className="btn-circle"
                      style={{ width: "42px", height: "42px" }}
                      aria-label={`Add ${result.title} to playlist`}
                      title="Add to Playlist"
                    >
                      <ListPlus size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddToPlaylistModal
        track={playlistTrack}
        isOpen={Boolean(playlistTrack)}
        onClose={() => setPlaylistTrack(null)}
      />
    </div>
  );
};
