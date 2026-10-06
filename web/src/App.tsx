import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PlayerProvider } from './context/PlayerContext'
import { BackdropProvider } from './context/BackdropContext'
import { Navigation } from './components/Navigation'
import { NowPlayingBar } from './components/NowPlayingBar'
import { QueueDrawer } from './components/QueueDrawer'
import { SignInPage, AuthGuard } from './components/AuthPage'

import { DiscoverPage } from './pages/DiscoverPage'
import { PlaylistsPage } from './pages/PlaylistsPage'
import { WizardPage } from './pages/WizardPage'
import { WrapPage } from './pages/WrapPage'
import { LyricsPage } from './pages/LyricsPage'
import { MetricsPage } from './pages/MetricsPage'

export const AppContent: React.FC = () => {
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false)

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <Navigation />

      <main
        style={{
          marginLeft: '280px',
          flex: 1,
          padding: '28px 40px 140px 20px',
          maxWidth: '1200px',
          width: 'calc(100% - 280px)',
        }}
      >
        <Routes>
          <Route path="/" element={<DiscoverPage />} />
          <Route
            path="/playlists"
            element={
              <AuthGuard>
                <PlaylistsPage />
              </AuthGuard>
            }
          />
          <Route path="/wizard" element={<WizardPage />} />
          <Route
            path="/wrap"
            element={
              <AuthGuard>
                <WrapPage />
              </AuthGuard>
            }
          />
          <Route path="/lyrics" element={<LyricsPage />} />
          <Route path="/metrics" element={<MetricsPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
        </Routes>
      </main>

      <NowPlayingBar
        onToggleQueue={() => setIsQueueOpen((prev) => !prev)}
        isQueueOpen={isQueueOpen}
      />

      <QueueDrawer isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
    </div>
  )
}

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
  )
}

export default App
