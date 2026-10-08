import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PlayerProvider } from "./context/PlayerContext";
import { BackdropProvider } from "./context/BackdropContext";
import { Navigation } from "./components/Navigation";
import { NowPlayingBar } from "./components/NowPlayingBar";
import { QueueDrawer } from "./components/QueueDrawer";

import { HomePage } from "./pages/HomePage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { LibraryPage } from "./pages/LibraryPage";
import { PlaylistsPage } from "./pages/PlaylistsPage";
import { PlaylistDetailPage } from "./pages/PlaylistDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/OnboardingPage";

export const AppContent = () => {
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "var(--color-bg)",
      }}
    >
      <Navigation />

      <main
        style={{
          marginLeft: "280px",
          flex: 1,
          padding: "28px 40px 140px 20px",
          maxWidth: "1200px",
          width: "calc(100% - 280px)",
        }}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/playlists" element={<PlaylistsPage />} />
          <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
          <Route path="/sign-in" element={<LoginPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route
            path="*"
            element={
              <section style={{ padding: "40px" }}>
                <h1 style={{ color: "#FFFFFF", marginBottom: "12px" }}>Page not found</h1>
                <Link to="/" className="btn-glass" style={{ textDecoration: "none" }}>Go to Home</Link>
              </section>
            }
          />
        </Routes>
      </main>

      <NowPlayingBar
        onToggleQueue={() => setIsQueueOpen((prev) => !prev)}
        isQueueOpen={isQueueOpen}
      />

      <QueueDrawer isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <BackdropProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </BackdropProvider>
      </PlayerProvider>
    </AuthProvider>
  );
}

export default App;
