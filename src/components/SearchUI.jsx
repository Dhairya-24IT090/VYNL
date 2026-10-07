/**
 * Search UI — calls the streaming API for real search + ingest + stream playback.
 * Flow: search → display results → on Play: ingest → stream-link → playTrack()
 */
import React, { useState, useEffect, useRef } from "react";
import { Search, Play, Plus, Loader2, RotateCcw } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";

export const SearchUI = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingTrackId, setLoadingTrackId] = useState(null);

  const { playTrack, addToQueue } = usePlayer();
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
      <div style={{ position: "relative", marginBottom: "20px" }}>
        <input
          data-testid="search-input"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search tracks, artists..."
          className="input-glass"
          style={{
            paddingLeft: "44px",
            paddingRight: "40px",
            height: "48px",
            fontSize: "15px",
            borderRadius: "var(--radius-pill)",
          }}
          aria-label="Search"
        />

        <Search
          size={18}
          style={{
            position: "absolute",
            left: "16px",
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
              right: "16px",
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
            padding: "20px",
            borderRadius: "var(--radius-inner)",
            borderColor: "var(--color-danger)",
            backgroundColor: "var(--color-danger-glass)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <div>
            <div
              style={{ fontWeight: 600, color: "#FFFFFF", fontSize: "14px" }}
            >
              Error
            </div>
            <div
              style={{
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "13px",
                marginTop: "2px",
              }}
            >
              {error}
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="btn-primary"
            style={{ padding: "8px 16px", fontSize: "13px" }}
          >
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div
          data-testid="search-results-list"
          style={{ display: "flex", flexDirection: "column", gap: "8px" }}
        >
          {results.map((result) => {
            const isTrackLoading = loadingTrackId === result.apple_track_id;
            return (
              <div
                key={result.apple_track_id}
                data-testid={`search-result-${result.apple_track_id}`}
                className="glass-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-md)",
                  opacity: isTrackLoading ? 0.6 : 1,
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "14px" }}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "var(--radius-sm)",
                      overflow: "hidden",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      flexShrink: 0,
                    }}
                  >
                    {result.artwork_url && (
                      <img
                        src={result.artwork_url}
                        alt={result.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#FFFFFF",
                        fontSize: "14px",
                      }}
                    >
                      {result.title}
                    </div>
                    <div
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: "12px",
                      }}
                    >
                      {result.artist} • {formatDuration(result.duration_ms)}
                    </div>
                  </div>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <button
                    data-testid={`play-search-${result.apple_track_id}`}
                    onClick={() => handlePlay(result)}
                    disabled={isTrackLoading}
                    className="btn-glass"
                    style={{ padding: "6px 12px", fontSize: "12px" }}
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
                    className="btn-glass"
                    style={{ padding: "6px 10px", fontSize: "12px" }}
                    aria-label={`Queue ${result.title}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
