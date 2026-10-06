/**
 * Recommendation UI Component per Task 8 [F7-11].
 * Presents personalized audio recommendations and records all user interactions
 * directly into the client telemetry buffer.
 */
import React from 'react'
import { Sparkles, Play } from 'lucide-react'
import type { Track } from '../types'
import { usePlayer } from '../context/PlayerContext'
import { eventBuffer } from '../services/eventBuffer'

interface RecommendationUIProps {
  tracks: Track[]
  title?: string
}

export const RecommendationUI: React.FC<RecommendationUIProps> = ({
  tracks,
  title = 'Recommended For You',
}) => {
  const { playTrack } = usePlayer()

  const handleTrackClick = (track: Track) => {
    // Record interaction in activity buffer per Task 8 [F7-11]
    eventBuffer.push({
      event_type: 'recommendation_click',
      track_id: track.id,
      context: 'recommendations_feed',
    })
    playTrack(track)
  }

  return (
    <div style={{ margin: '24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Sparkles size={18} style={{ color: 'var(--color-accent)' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>{title}</h2>
      </div>

      <div
        data-testid="recommendations-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        {tracks.map((track) => (
          <div
            key={track.id}
            data-testid={`rec-card-${track.id}`}
            className="glass-card"
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              cursor: 'pointer',
            }}
            onClick={() => handleTrackClick(track)}
          >
            <div
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                position: 'relative',
              }}
            >
              {track.cover_url && (
                <img
                  src={track.cover_url}
                  alt={track.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 200ms ease',
                }}
                className="hover-overlay"
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Play size={18} fill="#0F0F0F" style={{ marginLeft: '2px' }} />
                </div>
              </div>
            </div>

            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '14px',
                  color: '#FFFFFF',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {track.title}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  marginTop: '2px',
                }}
              >
                {track.artist}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
