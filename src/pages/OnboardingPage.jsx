import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/apiClient";
import { useAuth } from "../context/AuthContext";
import { Check, Sparkles, Music } from "lucide-react";

export const OnboardingPage = () => {
  const [genres, setGenres] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { checkSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    api
      .get("/v1/onboarding/genres")
      .then((data) => {
        if (isMounted && data.genres) {
          setGenres(data.genres);
        }
      })
      .catch((err) => {
        if (isMounted) setError("Failed to load musical preferences catalog.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleGenre = (genreId) => {
    setSelected((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : prev.length < 15
        ? [...prev, genreId]
        : prev
    );
  };

  const handleSubmit = async () => {
    if (selected.length < 3) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/v1/onboarding/preferences", {
        genres: selected,
        artists: [],
        languages: ["en"],
      });
      await checkSession();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.data?.detail || "Could not save preferences. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <p style={{ color: "var(--color-text-secondary)" }}>Loading musical universe...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "32px 20px",
      }}
    >
      <header style={{ marginBottom: "32px", textAlign: "center" }}>
        <h1
          className="font-display"
          style={{
            fontSize: "30px",
            color: "#FFFFFF",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <Sparkles size={28} /> Tailor Your Sound
        </h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "15px",
            maxWidth: "540px",
            margin: "0 auto",
          }}
        >
          Select at least 3 genres to calibrate the recommendation engine for continuous playback.
        </p>
      </header>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--color-danger-glass)",
            color: "var(--color-danger)",
            fontSize: "14px",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "14px",
          marginBottom: "36px",
        }}
      >
        {genres.map((g) => {
          const isSelected = selected.includes(g.id);
          return (
            <button
              key={g.id}
              onClick={() => toggleGenre(g.id)}
              type="button"
              className="glass-panel"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "20px 14px",
                cursor: "pointer",
                border: isSelected
                  ? "1px solid var(--color-accent)"
                  : "1px solid var(--color-border-subtle)",
                backgroundColor: isSelected
                  ? "var(--color-surface-glass-active)"
                  : "var(--color-surface-glass)",
                transition: "all var(--duration-fast)",
                color: "#FFFFFF",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSelected
                    ? "var(--color-accent)"
                    : "rgba(255, 255, 255, 0.08)",
                  color: isSelected ? "#0F0F0F" : "#FFFFFF",
                }}
              >
                {isSelected ? <Check size={20} /> : <Music size={18} />}
              </div>
              <span style={{ fontSize: "14px", fontWeight: 600 }}>{g.name}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          onClick={handleSubmit}
          disabled={selected.length < 3 || submitting}
          className="btn-glass"
          style={{
            padding: "14px 40px",
            fontSize: "15px",
            fontWeight: 700,
            cursor: selected.length >= 3 && !submitting ? "pointer" : "not-allowed",
            opacity: selected.length >= 3 ? 1 : 0.5,
          }}
        >
          {submitting
            ? "Calibrating..."
            : `Complete Setup (${selected.length}/3 selected)`}
        </button>
      </div>
    </div>
  );
};
