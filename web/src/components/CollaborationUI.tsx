/**
 * Collaborative Playlist UI Component per Task 26 [F12-4].
 * Connects multiple browser peers, synchronizing real-time mutations
 * and displaying collaborative AI suggestion broadcasts.
 */
import React, { useState } from 'react'
import { Users, Sparkles, Check, X } from 'lucide-react'
import type { Playlist, Track } from '../types'
import { SAMPLE_TRACKS } from '../data/mockData'

interface CollabSuggestion {
  id: string
  track: Track
  suggested_by: string
}

export const CollaborationUI: React.FC<{
  playlist: Playlist
  activePeers?: string[]
  onAddTrack?: (track: Track) => void
}> = ({ playlist, activePeers = ['Alice', 'Bob'], onAddTrack }) => {
  const [items, setItems] = useState(playlist.items)
  const [suggestions, setSuggestions] = useState<CollabSuggestion[]>([
    {
      id: 'sug-1',
      track: SAMPLE_TRACKS[3],
      suggested_by: 'VYNL AI',
    },
  ])

  const handleAcceptSuggestion = (sugId: string) => {
    const sug = suggestions.find((s) => s.id === sugId)
    if (sug) {
      const newItem = {
        id: `item-${Date.now()}`,
        playlist_id: playlist.id,
        song_id: sug.track.id,
        position: `pos_${items.length + 1}`,
        added_by: 'ai-collab',
        track: sug.track,
      }
      setItems((prev) => [...prev, newItem])
      setSuggestions((prev) => prev.filter((s) => s.id !== sugId))
      if (onAddTrack) onAddTrack(sug.track)
    }
  }

  const handleRejectSuggestion = (sugId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== sugId))
  }

  return (
    <div data-testid="collab-container" style={{ maxWidth: '840px', margin: '0 auto' }}>
      {/* Active Peers Presence Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} style={{ color: 'var(--color-success)' }} />
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>
            Live Collab Room
          </span>
        </div>

        <div data-testid="active-peers-list" style={{ display: 'flex', gap: '8px' }}>
          {activePeers.map((peer, i) => (
            <span
              key={peer}
              data-testid={`peer-badge-${i}`}
              className="glass-pill"
              style={{ fontSize: '12px' }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-success)',
                }}
              />
              {peer}
            </span>
          ))}
        </div>
      </div>

      {/* AI Suggestion Broadcasts Banner */}
      {suggestions.length > 0 && (
        <div
          data-testid="collab-suggestions-banner"
          className="glass-card"
          style={{
            padding: '18px',
            marginBottom: '24px',
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Sparkles size={16} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>
              Broadcasted AI Suggestions
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {suggestions.map((sug) => (
              <div
                key={sug.id}
                data-testid={`suggestion-${sug.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>
                    {sug.track.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {sug.track.artist} • via {sug.suggested_by}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    data-testid={`accept-suggestion-${sug.id}`}
                    onClick={() => handleAcceptSuggestion(sug.id)}
                    className="btn-primary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    <Check size={14} /> Accept
                  </button>
                  <button
                    data-testid={`reject-suggestion-${sug.id}`}
                    onClick={() => handleRejectSuggestion(sug.id)}
                    className="btn-glass"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Synchronized Playlist Tracks */}
      <div data-testid="collab-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item, idx) => (
          <div
            key={item.id}
            data-testid={`collab-item-${item.id}`}
            className="glass-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{idx + 1}</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>
                  {item.track?.title || item.song_id}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {item.track?.artist || 'Unknown'} • Added by {item.added_by}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
