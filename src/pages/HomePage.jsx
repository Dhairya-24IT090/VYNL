import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/apiClient";
import { useAuth } from "../context/AuthContext";
import { TrackCard } from "../components/TrackCard";
import { TrackRow } from "../components/TrackRow";
import { Sparkles, TrendingUp, History, Compass } from "lucide-react";

export const HomePage = () => {
  const { user, isAuthenticated } = useAuth();
  const [forYou, setForYou] = useState([]);
  const [trending, setTrending] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const promises = [
      api.get("/v1/recommendations/trending?limit=12").catch(() => ({ trending: [] })),
    ];

    if (isAuthenticated) {
      promises.push(
        api.get("/v1/recommendations/for-you?limit=12").catch(() => ({ recommendations: [] }))
      );
      promises.push(
        api.get("/v1/history/recent?limit=8").catch(() => ({ history: [] }))
      );
    }

    Promise.all(promises).then(([trendingData, forYouData, recentData]) => {
      if (!isMounted) return;
      setTrending(trendingData?.trending || []);
      if (forYouData) setForYou(forYouData?.recommendations || []);
      if (recentData) setRecent(recentData?.history || []);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Determine top 3 tracks for fanned shelf (prefer Trending or For You)
  const fannedSource = trending.length >= 3 ? trending : forYou.length >= 3 ? forYou : [];
  const fannedTracks = fannedSource.slice(0, 3);
  const remainingTrending = trending.slice(fannedSource === trending ? 3 : 0);

  return (
    <div
      data-testid="page-home"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "36px",
        width: "100%",
      }}
    >
      {/* 1. Header Hero Greeting */}
      <header>
        <h1
          className="font-display"
          style={{
            fontSize: "var(--text-hero)",
            fontWeight: 700,
            color: "#FFFFFF",
            marginBottom: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {isAuthenticated && user
            ? `Welcome, ${user.username}`
            : "Welcome to VYNL"}
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "15px" }}>
          Adaptive algorithmic streams curated for your acoustic taste profile.
        </p>
      </header>

      {/* 2. Onboarding Prompt Banner (If Needed) */}
      {isAuthenticated && user && !user.onboarding_complete && (
        <div
          className="glass-panel"
          style={{
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--color-border-active)",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#FFFFFF",
                marginBottom: "4px",
              }}
            >
              Calibrate Your Sound Preferences
            </h3>
            <p style={{ fontSize: "13px", color: "var(--color-text-subtle)" }}>
              Pick your favorite genres to enhance continuous playback recommendations.
            </p>
          </div>
          <Link
            to="/onboarding"
            className="btn-glass"
            style={{ textDecoration: "none", fontSize: "13px" }}
          >
            Start Onboarding
          </Link>
        </div>
      )}

      {/* 3. Fanned Featured Shelf (First 3 tracks per Amendment 1) */}
      {fannedTracks.length >= 3 && (
        <section aria-label="Featured Releases">
          <div className="fanned-shelf-container">
            <TrackCard
              key={fannedTracks[0].track_id || fannedTracks[0].id || 0}
              track={fannedTracks[0]}
              variant="fanned"
              fannedClass="fanned-card-left"
            />
            <TrackCard
              key={fannedTracks[1].track_id || fannedTracks[1].id || 1}
              track={fannedTracks[1]}
              variant="fanned"
              fannedClass="fanned-card-mid"
            />
            <TrackCard
              key={fannedTracks[2].track_id || fannedTracks[2].id || 2}
              track={fannedTracks[2]}
              variant="fanned"
              fannedClass="fanned-card-right"
            />
          </div>
        </section>
      )}

      {/* 4. "For You" Section (Authenticated users - All 12 tracks preserved) */}
      {isAuthenticated && forYou.length > 0 && (
        <section aria-labelledby="section-for-you">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <Sparkles size={20} color="var(--color-accent)" />
            <h2
              id="section-for-you"
              style={{ fontSize: "20px", fontWeight: 600, color: "#FFFFFF" }}
            >
              For You
            </h2>
          </div>

          <div
            className="glass-panel"
            style={{
              borderRadius: "var(--radius-panel)",
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              overflow: "hidden",
            }}
          >
            {forYou.map((track, i) => (
              <TrackRow
                key={track.track_id || track.id || `foryou-${i}`}
                track={track}
                index={i}
              />
            ))}
          </div>
        </section>
      )}

      {/* 5. "Trending Now" Section (All 12 tracks preserved per Amendment 1) */}
      <section aria-labelledby="section-trending">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "16px",
          }}
        >
          <TrendingUp size={20} color="var(--color-accent)" />
          <h2
            id="section-trending"
            style={{ fontSize: "20px", fontWeight: 600, color: "#FFFFFF" }}
          >
            Trending Now
          </h2>
        </div>

        {trending.length > 0 ? (
          <div
            className="glass-panel"
            style={{
              borderRadius: "var(--radius-panel)",
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              overflow: "hidden",
            }}
          >
            {/* If fanned shelf is shown, remaining trending tracks render in rows; otherwise all render */}
            {(fannedTracks.length >= 3 ? remainingTrending : trending).map((track, i) => (
              <TrackRow
                key={track.track_id || track.id || `trending-${i}`}
                track={track}
                index={i}
              />
            ))}
          </div>
        ) : (
          <div
            className="glass-panel"
            style={{
              padding: "40px 24px",
              textAlign: "center",
              borderRadius: "var(--radius-card)",
            }}
          >
            <p
              style={{
                color: "var(--color-text-tertiary)",
                fontSize: "14px",
                marginBottom: "16px",
              }}
            >
              {loading
                ? "Loading recommendations..."
                : "No trending songs in database yet."}
            </p>
            <Link
              to="/discover"
              className="btn-glass"
              style={{
                textDecoration: "none",
                fontSize: "14px",
                display: "inline-flex",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <Compass size={16} /> Search & Ingest Music
            </Link>
          </div>
        )}
      </section>

      {/* 6. "Recently Played" Section (All 8 tracks preserved) */}
      {isAuthenticated && recent.length > 0 && (
        <section aria-labelledby="section-recently-played">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <History size={20} color="var(--color-accent)" />
            <h2
              id="section-recently-played"
              style={{ fontSize: "20px", fontWeight: 600, color: "#FFFFFF" }}
            >
              Recently Played
            </h2>
          </div>

          <div
            className="glass-panel"
            style={{
              borderRadius: "var(--radius-panel)",
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              overflow: "hidden",
            }}
          >
            {recent.map((track, i) => (
              <TrackRow
                key={track.track_id || track.id || `recent-${i}`}
                track={track}
                index={i}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
