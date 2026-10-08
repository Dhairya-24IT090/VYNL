import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogIn } from "lucide-react";

export const LoginPage = () => {
  const { user, isAuthenticated, login } = useAuth();

  if (isAuthenticated && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        textAlign: "center",
        padding: "20px",
      }}
    >
      <div
        className="glass-panel"
        style={{
          padding: "48px 40px",
          maxWidth: "440px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <h1
          className="font-display"
          style={{
            fontSize: "28px",
            fontWeight: 700,
            background:
              "linear-gradient(135deg, #FFFFFF 0%, rgba(255, 255, 255, 0.6) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Welcome to VYNL
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "var(--color-text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Sign in to unlock personalized continuous playback, personalized taste recommendations, and cloud playlists.
        </p>

        <button
          onClick={() => login("/")}
          className="btn-glass"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "14px 20px",
            fontSize: "15px",
            fontWeight: 600,
            cursor: "pointer",
            marginTop: "10px",
          }}
        >
          <LogIn size={18} />
          Continue with Google
        </button>
      </div>
    </div>
  );
};
