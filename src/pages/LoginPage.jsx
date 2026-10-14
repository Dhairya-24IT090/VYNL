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
          maxWidth: "460px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          borderRadius: "var(--radius-panel)",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)",
          border: "1px solid var(--border-glass)",
          backdropFilter: "blur(var(--blur-glass))",
          WebkitBackdropFilter: "blur(var(--blur-glass))",
          boxShadow: "var(--shadow-fan)",
        }}
      >
        <h1
          className="font-brand"
          style={{
            fontSize: "32px",
            color: "#FFFFFF",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          VYNL
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: "rgba(255, 255, 255, 0.7)",
            lineHeight: 1.6,
          }}
        >
          Sign in to unlock personalized continuous playback, taste recommendations, and cloud playlists.
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
