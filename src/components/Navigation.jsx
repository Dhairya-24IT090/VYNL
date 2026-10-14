import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Compass, Heart, ListMusic, LogOut, LogIn, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Navigation = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const navItems = [
    { path: "/", label: "Home", icon: Home, testId: "nav-link-discover" },
    { path: "/discover", label: "Discover", icon: Compass, testId: "nav-link-discover" },
    { path: "/playlists", label: "Playlists", icon: ListMusic, testId: "nav-link-playlists" },
    { path: "/library", label: "Library", icon: Heart, testId: "nav-link-library" },
  ];

  // Close profile dropdown on outside click or Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isProfileOpen) {
        setIsProfileOpen(false);
      }
    };
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileOpen]);

  return (
    <>
      {/* 1. Desktop Top-Left Brand Wordmark */}
      <div
        className="brand-wordmark-container"
        style={{
          position: "fixed",
          top: "28px",
          left: "28px",
          zIndex: 70,
        }}
      >
        <Link
          to="/"
          style={{ textDecoration: "none" }}
          aria-label="VYNL Home"
        >
          <span
            className="font-display"
            style={{
              fontSize: "26px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              background:
                "linear-gradient(135deg, #FFFFFF 0%, rgba(255, 255, 255, 0.75) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textTransform: "uppercase",
            }}
          >
            VYNL
          </span>
        </Link>
      </div>

      {/* 2. Desktop Floating Vertical Icon Rail (>=768px) */}
      <aside
        className="glass-icon-rail"
        aria-label="Primary Icon Navigation"
        style={{
          position: "fixed",
          left: "24px",
          top: "90px",
          width: "76px",
          maxHeight: "calc(100vh - 120px)",
          height: "460px",
          borderRadius: "var(--radius-rail)",
          backgroundColor: "var(--color-glass-frosted)",
          backdropFilter: "var(--backdrop-blur-dock)",
          WebkitBackdropFilter: "var(--backdrop-blur-dock)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
          zIndex: 65,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 0",
        }}
      >
        {/* Navigation Icon Links */}
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            width: "100%",
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={item.testId}
                aria-label={item.label}
                title={item.label}
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "var(--radius-chip)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isActive
                    ? "var(--color-glass-chip)"
                    : "transparent",
                  color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.7)",
                  border: isActive
                    ? "1px solid rgba(255, 255, 255, 0.15)"
                    : "1px solid transparent",
                  transition: "all var(--duration-fast) var(--ease-smooth)",
                  textDecoration: "none",
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              </Link>
            );
          })}
        </nav>

        {/* Profile Avatar / Auth Trigger Chip at Rail Bottom */}
        <div style={{ position: "relative" }} ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen((prev) => !prev)}
            aria-label={isAuthenticated && user ? `Profile of ${user.username}` : "Sign In Options"}
            aria-haspopup="true"
            aria-expanded={isProfileOpen}
            className="btn-circle"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "var(--color-glass-chip)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#FFFFFF",
              overflow: "hidden",
            }}
          >
            {isAuthenticated && user ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "#FFFFFF",
                }}
              >
                {user.username?.[0]?.toUpperCase() || "U"}
              </div>
            ) : (
              <User size={18} />
            )}
          </button>

          {/* Profile Flyout Popover */}
          {isProfileOpen && (
            <div
              className="glass-panel"
              role="dialog"
              aria-label="User Account Menu"
              style={{
                position: "absolute",
                left: "64px",
                bottom: 0,
                width: "210px",
                padding: "16px",
                borderRadius: "var(--radius-card)",
                backgroundColor: "rgba(18, 18, 22, 0.98)",
                boxShadow: "var(--shadow-floating)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {isAuthenticated && user ? (
                <>
                  <div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#FFFFFF",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {user.username}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--color-success)",
                        marginTop: "2px",
                      }}
                    >
                      ● Session Active
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      logout();
                    }}
                    className="btn-glass"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      padding: "8px 12px",
                      fontSize: "13px",
                      color: "var(--color-danger)",
                      borderColor: "var(--color-danger-glass)",
                      minHeight: "38px",
                    }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                    Sign in to personalize your listening.
                  </div>
                  <Link
                    to="/sign-in"
                    onClick={() => setIsProfileOpen(false)}
                    className="btn-primary"
                    style={{
                      textDecoration: "none",
                      width: "100%",
                      fontSize: "13px",
                      padding: "8px 14px",
                      minHeight: "38px",
                    }}
                  >
                    <LogIn size={15} /> Sign In
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* 3. Top Floating Glass Pill Navigation (>=768px) */}
      <header
        className="top-pill-nav-container"
        style={{
          position: "fixed",
          top: "20px",
          left: "120px",
          right: "clamp(380px, 30vw, 460px)",
          display: "flex",
          justifyContent: "center",
          zIndex: 55,
          pointerEvents: "none",
        }}
      >
        <nav
          className="glass-pill-nav"
          aria-label="Section Navigation"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 10px",
            gap: "8px",
            borderRadius: "var(--radius-pill-nav)",
            backgroundColor: "var(--color-glass-frosted)",
            backdropFilter: "var(--backdrop-blur-pill)",
            WebkitBackdropFilter: "var(--backdrop-blur-pill)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
            pointerEvents: "auto",
            maxWidth: "680px",
            overflowX: "auto",
          }}
        >
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 24px",
                  borderRadius: "var(--radius-chip)",
                  backgroundColor: isActive
                    ? "var(--color-glass-chip)"
                    : "transparent",
                  color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.65)",
                  textDecoration: "none",
                  fontSize: "15px",
                  fontWeight: 600,
                  transition: "all var(--duration-fast) var(--ease-smooth)",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* 4. Mobile Bottom Navigation Tab Bar (<768px) */}
      <nav
        className="mobile-nav-bar"
        aria-label="Mobile Navigation"
        style={{
          position: "fixed",
          bottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
          left: "14px",
          right: "14px",
          height: "60px",
          borderRadius: "30px",
          backgroundColor: "rgba(18, 18, 22, 0.94)",
          backdropFilter: "var(--backdrop-blur)",
          WebkitBackdropFilter: "var(--backdrop-blur)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-floating)",
          zIndex: 90,
          display: "none", // toggled via CSS media query
          alignItems: "center",
          justifyContent: "space-around",
          padding: "0 8px",
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "48px",
                height: "44px",
                borderRadius: "16px",
                color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.5)",
                backgroundColor: isActive
                  ? "rgba(255, 255, 255, 0.1)"
                  : "transparent",
                textDecoration: "none",
                fontSize: "10px",
                fontWeight: 600,
                gap: "2px",
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Mobile Profile Trigger */}
        <button
          onClick={() => setIsProfileOpen((prev) => !prev)}
          aria-label="User Profile"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "48px",
            height: "44px",
            borderRadius: "16px",
            background: "transparent",
            border: "none",
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "10px",
            fontWeight: 600,
            gap: "2px",
            cursor: "pointer",
          }}
        >
          <User size={18} />
          <span>Profile</span>
        </button>
      </nav>
    </>
  );
};
