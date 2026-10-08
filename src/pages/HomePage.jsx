import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/apiClient";
import { useAuth } from "../context/AuthContext";
import { TrackCard } from "../components/TrackCard";
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

  return (
    <div data-testid="page-home" style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
      <header>
        <h1
          className="font-display"
          style={{ fontSize: "28px", color: "#FFFFFF", marginBottom: "8px" }}
        >
          {isAuthenticated && user
            ? `Welcome back, ${user.username}`
            : "Welcome to VYNL"}
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "15px" }}>
          Adaptive algorithmic streams curated for your acoustic taste profile.
        </p>
      </header>

      {isAuthenticated && user && !user.onboarding_complete && (
        <div
          className="glass-panel"
          style={{
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            border: "1px solid var(--color-border-active)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", marginBottom: "4px" }}>
              Calibrate Your Sound Preferences
            </h3>
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
              Pick your favorite genres to enhance continuous playback recommendations.
            </p>
          </div>
          <Link to="/onboarding" className="btn-glass" style={{ textDecoration: "none", fontSize: "13px" }}>
            Start Onboarding
          </Link>
        </div>
      )}

      {isAuthenticated && forYou.length > 0 && (
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Sparkles size={20} color="var(--color-accent)" />
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#FFFFFF" }}>
              For You
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "16px",
            }}
          >
            {forYou.map((track) => (
              <TrackCard key={track.track_id || track.id} track={track} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <TrendingUp size={20} color="var(--color-accent)" />
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#FFFFFF" }}>
            Trending Now
          </h2>
        </div>
        {trending.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "16px",
            }}
          >
            {trending.map((track) => (
              <TrackCard key={track.track_id || track.id} track={track} />
            ))}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: "32px", textAlign: "center" }}>
            <p style={{ color: "var(--color-text-tertiary)", fontSize: "14px", marginBottom: "12px" }}>
              {loading ? "Loading recommendations..." : "No trending songs in database yet."}
            </p>
            <Link to="/discover" className="btn-glass" style={{ textDecoration: "none", fontSize: "13px", display: "inline-flex", gap: "8px", alignItems: "center" }}>
              <Compass size={15} /> Search & Ingest Music
            </Link>
          </div>
        )}
      </section>

      {isAuthenticated && recent.length > 0 && (
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <History size={20} color="var(--color-accent)" />
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#FFFFFF" }}>
              Recently Played
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "16px",
            }}
          >
            {recent.map((track) => (
              <TrackCard key={track.track_id || track.id} track={track} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
