/**
 * Monthly Wrap UI Component per Task 37 [F17-6].
 * Renders rich listening cards (minutes, streaks, top artists/tracks)
 * and gracefully handles empty states when history is zero.
 */
import React, { useState } from 'react'
import { Award, Clock, Flame, Sparkles } from 'lucide-react'
import type { MonthlyWrapData } from '../types'
import { SAMPLE_WRAP, EMPTY_WRAP } from '../data/mockData'

interface WrapUIProps {
  initialWrap?: MonthlyWrapData
}

export const WrapUI: React.FC<WrapUIProps> = ({ initialWrap = SAMPLE_WRAP }) => {
  const [wrapData, setWrapData] = useState<MonthlyWrapData>(initialWrap)

  const hasHistory = wrapData.total_minutes_listened > 0 || wrapData.top_tracks.length > 0

  return (
    <div data-testid="wrap-container" style={{ maxWidth: '840px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Month Header & Period Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Award size={20} style={{ color: 'var(--color-accent)' }} />
            <h1 className="font-display" style={{ fontSize: '24px', color: '#FFFFFF' }}>
              Monthly Wrap
            </h1>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Period: {wrapData.period} • {wrapData.is_final ? 'Finalized' : 'In Progress'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            data-testid="toggle-sample-wrap"
            onClick={() => setWrapData(SAMPLE_WRAP)}
            className={wrapData === SAMPLE_WRAP ? 'btn-primary' : 'btn-glass'}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            Full History
          </button>
          <button
            data-testid="toggle-empty-wrap"
            onClick={() => setWrapData(EMPTY_WRAP)}
            className={wrapData === EMPTY_WRAP ? 'btn-primary' : 'btn-glass'}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            Zero History
          </button>
        </div>
      </div>

      {!hasHistory ? (
        /* Empty State Handling per Task 37 [F17-6] */
        <div
          data-testid="wrap-empty-state"
          className="glass-card"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <Sparkles size={36} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF', marginBottom: '8px' }}>
            No Listening History for {wrapData.period}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', maxWidth: '420px', margin: '0 auto' }}>
            Start playing tracks, creating playlists, or testing the AI wizard to begin collecting your monthly audio insights.
          </p>
        </div>
      ) : (
        /* Full Listening Insight Cards */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Key Stat Highlights Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            <div
              data-testid="stat-minutes"
              className="glass-card"
              style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-tertiary)', marginBottom: '8px' }}>
                <Clock size={16} /> Total Time
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#FFFFFF' }}>
                {wrapData.total_minutes_listened.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Minutes streamed
              </div>
            </div>

            <div
              data-testid="stat-streak"
              className="glass-card"
              style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-tertiary)', marginBottom: '8px' }}>
                <Flame size={16} style={{ color: '#F97316' }} /> Longest Streak
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#FFFFFF' }}>
                {wrapData.longest_streak_days}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Consecutive active days
              </div>
            </div>

            <div
              data-testid="stat-discovery"
              className="glass-card"
              style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-tertiary)', marginBottom: '8px' }}>
                <Sparkles size={16} /> Discovery Rate
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#FFFFFF' }}>
                {wrapData.discovery_rate_percentage}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                New artists explored
              </div>
            </div>
          </div>

          {/* Top Artists & Tracks Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Top Artists */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', marginBottom: '16px' }}>
                Top Artists
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {wrapData.top_artists.map((artist, i) => (
                  <div
                    key={artist.artist}
                    data-testid={`top-artist-${i}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-tertiary)', width: '18px' }}>
                        {i + 1}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#FFFFFF' }}>
                        {artist.artist}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {artist.play_count} plays
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Tracks */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', marginBottom: '16px' }}>
                Top Tracks
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {wrapData.top_tracks.map((track, i) => (
                  <div
                    key={track.id}
                    data-testid={`top-track-${i}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-tertiary)', width: '18px' }}>
                        {i + 1}
                      </span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#FFFFFF' }}>
                          {track.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {track.artist}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {track.play_count} plays
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
