import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../services/apiClient";
import { usePlayer } from "../context/PlayerContext";
import {
  Play,
  Trash2,
  ArrowLeft,
  Shuffle,
  Plus,
  Search,
  RefreshCw,
  Check,
  Loader2,
  Music,
  X,
} from "lucide-react";

export const PlaylistDetailPage = () => {
  const { id } = useParams();
  const { playTrack, playPlaylist } = usePlayer();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Songs Search Drawer State
  const [isAddSongsOpen, setIsAddSongsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingSearchTrackId, setAddingSearchTrackId] = useState(null);
  const [addedSearchIds, setAddedSearchIds] = useState(new Set());
  const searchDebounceRef = useRef(null);

  // 5-Song Sliding Window State
  const [candidatePool, setCandidatePool] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addingRecId, setAddingRecId] = useState(null);
  const [addedRecIds, setAddedRecIds] = useState(new Set());

  // Load Playlist Details
  useEffect(() => {
    let isMounted = true;
    api
      .get(`/v1/playlists/${id}`)
      .then((data) => {
        if (isMounted) {
          setPlaylist(data);
          fetchCandidatePool(data?.tracks || []);
        }
      })
      .catch(() => {
        if (isMounted) setError("Failed to load playlist.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Fetch Recommended Candidate Pool
  const fetchCandidatePool = async (existingTracks = []) => {
    setIsRefreshing(true);
    try {
      let pool = [];
      try {
        const trendRes = await api.get("/v1/recommendations/trending?limit=35");
        pool = Array.isArray(trendRes) ? trendRes : trendRes?.trending || [];
      } catch {}

      if (pool.length < 15) {
        try {
          const res = await fetch("/api/v1/tracks/search?title=hits");
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) pool = [...pool, ...data];
          }
        } catch {}
      }

      const existingIds = new Set(
        existingTracks.map((t) => t.track_id || t.id || t.apple_track_id)
      );

      const seen = new Set();
      const unique = [];
      for (const item of pool) {
        const key = item.track_id || item.id || `${item.title}-${item.artist}`;
        if (!existingIds.has(item.track_id || item.id) && !seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }

      setCandidatePool(unique);
    } catch {
      // Graceful fallback
    } finally {
      setIsRefreshing(false);
    }
  };

  // Debounced Search for "Add Songs" Panel
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (searchQuery.trim()) {
      setIsSearching(true);
      searchDebounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/v1/tracks/search?title=${encodeURIComponent(searchQuery.trim())}`
          );
          if (res.ok) {
            const data = await res.json();
            setSearchResults(Array.isArray(data) ? data : []);
          } else {
            setSearchResults([]);
          }
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 250);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  // Helper to add any track to the current playlist
  const handleAddTrackToPlaylist = async (targetTrack) => {
    let resolvedId = targetTrack.track_id || targetTrack.id;

    // Ingest if not yet registered in audio_db
    if (!resolvedId && (targetTrack.apple_track_id || (targetTrack.title && targetTrack.artist))) {
      try {
        const ingestRes = await fetch("/api/v1/tracks/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: targetTrack.title,
            artist: targetTrack.artist,
            apple_track_id: targetTrack.apple_track_id,
            apple_music_url: targetTrack.apple_music_url,
          }),
        });
        if (ingestRes.ok) {
          const ingestData = await ingestRes.json();
          resolvedId = ingestData?.track_id;
        }
      } catch {}
    }

    if (!resolvedId) return false;

    const trackMeta = {
      track_id: resolvedId,
      title: targetTrack.title,
      artist: targetTrack.artist,
      cover_url: targetTrack.cover_url || targetTrack.artwork_url,
      duration_seconds:
        targetTrack.duration_seconds ||
        (targetTrack.duration_ms ? Math.round(targetTrack.duration_ms / 1000) : 0),
    };

    await api.post(`/v1/playlists/${id}/tracks`, trackMeta);

    // Update local playlist state
    setPlaylist((prev) => ({
      ...prev,
      tracks: [...(prev.tracks || []), trackMeta],
      track_count: (prev.tracks?.length || 0) + 1,
    }));

    return true;
  };

  // Add from search panel
  const handleAddFromSearch = async (track) => {
    const trackKey = track.track_id || track.id || track.apple_track_id;
    setAddingSearchTrackId(trackKey);
    try {
      const ok = await handleAddTrackToPlaylist(track);
      if (ok) {
        setAddedSearchIds((prev) => new Set([...prev, trackKey]));
      }
    } finally {
      setAddingSearchTrackId(null);
    }
  };

  // Add from bottom 5-song sliding window & auto-refill
  const handleAddFromSlidingWindow = async (track) => {
    const trackKey = track.track_id || track.id || track.apple_track_id;
    setAddingRecId(trackKey);
    try {
      const ok = await handleAddTrackToPlaylist(track);
      if (ok) {
        setAddedRecIds((prev) => new Set([...prev, trackKey]));
        // Remove added track from candidate pool so next song in pool immediately slides in!
        setCandidatePool((prev) =>
          prev.filter(
            (t) => (t.track_id || t.id || t.apple_track_id) !== trackKey
          )
        );
      }
    } finally {
      setAddingRecId(null);
    }
  };

  // Refresh 5-song sliding window
  const handleRefreshSlidingWindow = () => {
    setIsRefreshing(true);
    // Cycle pool: move first 5 to end so next 5 slide in
    setCandidatePool((prev) => {
      if (prev.length <= 5) return prev;
      return [...prev.slice(5), ...prev.slice(0, 5)];
    });
    setTimeout(() => {
      setIsRefreshing(false);
    }, 300);
  };

  // Audio Playback Handlers
  const handlePlayTrack = async (track, idx = 0) => {
    if (playlist?.tracks && playlist.tracks.length > 0) {
      await playPlaylist(playlist.tracks, { shuffle: false, startIndex: idx });
      return;
    }
    let audioUrl = track.audio_url;
    const trackId = track.track_id || track.id;
    if (!audioUrl && trackId) {
      try {
        const res = await api.get(`/api/v1/tracks/${trackId}/stream-link`);
        audioUrl = res.stream_url;
      } catch {}
    }
    const playable = {
      id: trackId,
      track_id: trackId,
      title: track.title,
      artist: track.artist,
      duration_seconds: track.duration_seconds || 0,
      cover_url: track.cover_url || track.artwork_url,
      audio_url: audioUrl,
    };
    playTrack(playable);
  };

  const handlePlayAll = async () => {
    if (playlist?.tracks && playlist.tracks.length > 0) {
      await playPlaylist(playlist.tracks, { shuffle: false });
    }
  };

  const handleShuffle = async () => {
    if (playlist?.tracks && playlist.tracks.length > 0) {
      await playPlaylist(playlist.tracks, { shuffle: true });
    }
  };

  const handleRemoveTrack = async (trackId) => {
    try {
      await api.delete(`/v1/playlists/${id}/tracks/${trackId}`);
      setPlaylist((prev) => ({
        ...prev,
        tracks: prev.tracks.filter((t) => (t.track_id || t.id) !== trackId),
        track_count: Math.max(0, (prev.track_count || 1) - 1),
      }));
    } catch {}
  };

  if (loading) {
    return (
      <p style={{ color: "var(--color-text-tertiary)", padding: "40px" }}>
        Loading playlist...
      </p>
    );
  }

  if (error || !playlist) {
    return (
      <div style={{ padding: "40px 20px" }}>
        <p style={{ color: "var(--color-danger)", marginBottom: "16px" }}>
          {error || "Playlist not found."}
        </p>
        <Link
          to="/playlists"
          className="btn-glass"
          style={{ textDecoration: "none" }}
        >
          Back to Playlists
        </Link>
      </div>
    );
  }

  const tracks = playlist.tracks || [];
  const slidingWindow = candidatePool.slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <Link
        to="/playlists"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          color: "var(--color-text-secondary)",
          textDecoration: "none",
          fontSize: "14px",
        }}
      >
        <ArrowLeft size={16} /> Back to Playlists
      </Link>

      {/* Playlist Header */}
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1
            className="font-display"
            style={{
              fontSize: "32px",
              color: "#FFFFFF",
              marginBottom: "8px",
            }}
          >
            {playlist.name}
          </h1>
          <p style={{ color: "var(--color-text-tertiary)", fontSize: "14px" }}>
            {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {tracks.length > 0 && (
            <>
              <button
                onClick={handlePlayAll}
                className="btn-glass"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                }}
                title="Play All"
              >
                <Play size={16} fill="currentColor" /> Play All
              </button>
              <button
                onClick={handleShuffle}
                className="btn-glass"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  color: "var(--color-accent)",
                }}
                title="Shuffle Playlist"
              >
                <Shuffle size={16} /> Shuffle
              </button>
            </>
          )}

          <button
            onClick={() => setIsAddSongsOpen((prev) => !prev)}
            data-testid="add-songs-btn"
            className="btn-glass"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              backgroundColor: isAddSongsOpen
                ? "var(--color-surface-glass-active)"
                : "rgba(255, 255, 255, 0.05)",
              color: "#FFFFFF",
              border: isAddSongsOpen
                ? "1px solid rgba(255, 255, 255, 0.3)"
                : "1px solid var(--color-border)",
            }}
            title="Add Songs to Playlist"
          >
            <Plus size={16} /> Add Songs
          </button>
        </div>
      </header>

      {/* Expandable "Add Songs" Search Drawer / Panel */}
      {isAddSongsOpen && (
        <section
          data-testid="add-songs-panel"
          className="glass-panel"
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            animation: "fadeIn 200ms ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Search size={18} color="var(--color-text-secondary)" />
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#FFFFFF", margin: 0 }}>
                Search & Add Songs
              </h3>
            </div>
            <button
              onClick={() => setIsAddSongsOpen(false)}
              aria-label="Close add songs panel"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-text-tertiary)",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ position: "relative" }}>
            <input
              type="text"
              data-testid="playlist-search-input"
              placeholder="Search by track title or artist to add..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                paddingLeft: "38px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                color: "#FFFFFF",
                fontSize: "14px",
                outline: "none",
              }}
            />
            <Search
              size={16}
              color="var(--color-text-tertiary)"
              style={{ position: "absolute", left: "12px", top: "12px" }}
            />
            {isSearching && (
              <Loader2
                size={16}
                className="spin"
                color="var(--color-text-tertiary)"
                style={{ position: "absolute", right: "12px", top: "12px" }}
              />
            )}
          </div>

          {/* Search Results List */}
          {searchResults.length > 0 && (
            <div
              style={{
                maxHeight: "260px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {searchResults.map((item, i) => {
                const key = item.track_id || item.id || item.apple_track_id || i;
                const isAdding = addingSearchTrackId === key;
                const isAdded =
                  addedSearchIds.has(key) ||
                  tracks.some((t) => (t.track_id || t.id) === (item.track_id || item.id));

                return (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "rgba(255, 255, 255, 0.02)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                      {(item.cover_url || item.artwork_url) && (
                        <img
                          src={item.cover_url || item.artwork_url}
                          alt={item.title}
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "var(--radius-sm)",
                            objectFit: "cover",
                          }}
                        />
                      )}
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.artist}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => !isAdded && !isAdding && handleAddFromSearch(item)}
                      disabled={isAdded || isAdding}
                      data-testid={`add-search-track-${key}`}
                      className="btn-glass"
                      style={{
                        padding: "6px 12px",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        backgroundColor: isAdded
                          ? "rgba(34, 197, 94, 0.15)"
                          : "rgba(255, 255, 255, 0.08)",
                        color: isAdded ? "#4ade80" : "#FFFFFF",
                        border: isAdded
                          ? "1px solid rgba(34, 197, 94, 0.3)"
                          : "1px solid rgba(255, 255, 255, 0.1)",
                        cursor: isAdded ? "default" : "pointer",
                      }}
                    >
                      {isAdding ? (
                        <Loader2 size={13} className="spin" />
                      ) : isAdded ? (
                        <>
                          <Check size={13} /> Added
                        </>
                      ) : (
                        <>
                          <Plus size={13} /> Add
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Existing Playlist Tracklist */}
      {tracks.length === 0 ? (
        <div
          className="glass-panel"
          style={{ padding: "40px", textAlign: "center" }}
        >
          <Music size={32} color="var(--color-text-tertiary)" style={{ margin: "0 auto 12px" }} />
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "12px" }}>
            This playlist is empty.
          </p>
          <button
            onClick={() => setIsAddSongsOpen(true)}
            className="btn-glass"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px" }}
          >
            <Plus size={15} /> Add Songs
          </button>
        </div>
      ) : (
        <div
          className="glass-panel"
          style={{
            padding: "20px 24px",
            borderRadius: "var(--radius-panel)",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid var(--border-glass)",
            backdropFilter: "blur(var(--blur-glass))",
            WebkitBackdropFilter: "blur(var(--blur-glass))",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {tracks.map((track, idx) => {
              const trackId = track.track_id || track.id;
              const artwork = track.cover_url || track.artwork_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(track.title || "Track")}`;
              return (
                <div
                  key={trackId || idx}
                  className="track-row"
                  style={{
                    padding: "12px 16px",
                    borderBottom: idx < tracks.length - 1 ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        color: "rgba(255, 255, 255, 0.4)",
                        fontSize: "14px",
                        fontWeight: 600,
                        width: "24px",
                        textAlign: "center",
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div
                      style={{ position: "relative", flexShrink: 0, cursor: "pointer" }}
                      onClick={() => handlePlayTrack(track, idx)}
                      title={`Play ${track.title}`}
                      role="button"
                      aria-label={`Play ${track.title}`}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handlePlayTrack(track, idx);
                        }
                      }}
                    >
                      <img
                        src={artwork}
                        alt={track.title}
                        className="track-artwork-circle track-row-artwork"
                        style={{
                          width: "52px",
                          height: "52px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          flexShrink: 0,
                          backgroundColor: "rgba(255, 255, 255, 0.08)",
                          display: "block",
                        }}
                        onError={(e) => {
                          e.target.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(track.title || "Track")}`;
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "50%",
                          backgroundColor: "rgba(0, 0, 0, 0.4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background-color 150ms ease",
                        }}
                      >
                        <Play size={16} fill="#FFFFFF" color="#FFFFFF" style={{ marginLeft: "2px" }} />
                      </div>
                    </div>
                    <div className="track-row-text">
                      <div className="track-row-title">
                        {track.title || "Track"}
                      </div>
                      <div className="track-row-artist">
                        {track.artist || "Unknown Artist"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button
                      onClick={() => handleRemoveTrack(trackId)}
                      title="Remove from playlist"
                      aria-label={`Remove ${track.title} from playlist`}
                      className="btn-circle"
                      style={{
                        width: "40px",
                        height: "40px",
                        color: "rgba(255, 255, 255, 0.6)",
                        backgroundColor: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5-Song Sliding Window at Bottom of Playlist */}
      <section
        data-testid="recommended-sliding-window-section"
        className="glass-panel"
        style={{
          padding: "24px 28px",
          marginTop: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          borderRadius: "var(--radius-panel)",
          backgroundColor: "rgba(255, 255, 255, 0.04)",
          border: "1px solid var(--border-glass)",
          backdropFilter: "blur(var(--blur-glass))",
          WebkitBackdropFilter: "blur(var(--blur-glass))",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "17px",
                fontWeight: 700,
                color: "#FFFFFF",
                margin: 0,
              }}
            >
              Recommended Songs
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "var(--color-text-tertiary)",
                margin: "3px 0 0 0",
              }}
            >
              Suggested songs based on this playlist
            </p>
          </div>

          <button
            onClick={handleRefreshSlidingWindow}
            data-testid="refresh-recommendations-btn"
            className="btn-glass"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              fontSize: "12px",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
            }}
            title="Refresh Recommendations"
          >
            <RefreshCw
              size={13}
              style={{
                transition: "transform 300ms ease",
                transform: isRefreshing ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
            Refresh
          </button>
        </div>

        {/* The 5-Song Sliding Window */}
        <div
          data-testid="sliding-window-container"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {slidingWindow.length === 0 ? (
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-tertiary)",
                textAlign: "center",
                padding: "16px 0",
              }}
            >
              No more suggestions available right now.
            </p>
          ) : (
            slidingWindow.map((item, idx) => {
              const itemKey = item.track_id || item.id || item.apple_track_id || idx;
              const isAdding = addingRecId === itemKey;
              const isAdded = addedRecIds.has(itemKey);

              return (
                <div
                  key={itemKey}
                  data-testid={`sliding-window-item-${idx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(255, 255, 255, 0.025)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    transition: "transform 200ms ease, opacity 200ms ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <button
                      onClick={() => handlePlayTrack(item)}
                      title="Preview track"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--color-accent)",
                        cursor: "pointer",
                        padding: "2px",
                      }}
                    >
                      <Play size={14} fill="currentColor" />
                    </button>

                    {(item.cover_url || item.artwork_url) && (
                      <img
                        src={item.cover_url || item.artwork_url}
                        alt={item.title}
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "var(--radius-sm)",
                          objectFit: "cover",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                        }}
                      />
                    )}

                    <div style={{ overflow: "hidden" }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#FFFFFF",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--color-text-tertiary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.artist}
                      </div>
                    </div>
                  </div>

                  {/* Single + Button */}
                  <button
                    onClick={() => !isAdding && !isAdded && handleAddFromSlidingWindow(item)}
                    disabled={isAdding || isAdded}
                    data-testid={`add-recommended-track-${itemKey}`}
                    title="Add to playlist"
                    aria-label={`Add ${item.title} to playlist`}
                    className="btn-glass"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isAdded
                        ? "rgba(34, 197, 94, 0.2)"
                        : "rgba(255, 255, 255, 0.08)",
                      color: isAdded ? "#4ade80" : "#FFFFFF",
                      border: isAdded
                        ? "1px solid rgba(34, 197, 94, 0.4)"
                        : "1px solid rgba(255, 255, 255, 0.15)",
                      cursor: isAdded ? "default" : "pointer",
                      transition: "transform 150ms ease, background 150ms ease",
                    }}
                  >
                    {isAdding ? (
                      <Loader2 size={14} className="spin" />
                    ) : isAdded ? (
                      <Check size={14} />
                    ) : (
                      <Plus size={16} />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
