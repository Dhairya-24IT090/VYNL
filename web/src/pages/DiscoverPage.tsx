import React from 'react'
import { Play, Plus } from 'lucide-react'
import { SearchUI } from '../components/SearchUI'
import { RecommendationUI } from '../components/RecommendationUI'
import { DownloadUI } from '../components/DownloadUI'
import { SAMPLE_TRACKS } from '../data/mockData'
import { usePlayer } from '../context/PlayerContext'

export const DiscoverPage: React.FC = () => {
  const { playTrack, addToQueue } = usePlayer()

  return (
    <div data-testid="page-discover">
      <header style={{ marginBottom: '28px' }}>
        <h1 className="font-display" style={{ fontSize: '28px', color: '#FFFFFF', marginBottom: '8px' }}>
          Discover Music
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}>
          Explore generative AI streams, trending tracks, and personalized selections.
        </p>
      </header>

      {/* Search Input Bar (Task 3 [F2-6]) */}
      <SearchUI />

      {/* Personalized Recommendations (Task 8 [F7-11]) */}
      <RecommendationUI tracks={SAMPLE_TRACKS.slice(0, 4)} />

      {/* Featured Releases Track List */}
      <section style={{ marginTop: '36px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF', marginBottom: '16px' }}>
          Featured Tracks
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {SAMPLE_TRACKS.map((track, i) => (
            <div
              key={track.id}
              data-testid={`featured-track-${track.id}`}
              className="glass-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', width: '16px' }}>
                  {i + 1}
                </span>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }}
                >
                  {track.cover_url && (
                    <img
                      src={track.cover_url}
                      alt={track.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>{track.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {track.artist} • {track.genre}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Download UI (Task 7 [F6-3]) */}
                <DownloadUI track={track} />

                <button
                  data-testid={`play-btn-${track.id}`}
                  onClick={() => playTrack(track)}
                  className="btn-glass"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  aria-label={`Play ${track.title}`}
                >
                  <Play size={13} fill="#FFFFFF" /> Play
                </button>
                <button
                  onClick={() => addToQueue(track)}
                  className="btn-glass"
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                  aria-label={`Add ${track.title} to Queue`}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
