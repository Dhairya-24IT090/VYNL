/**
 * Search UI Component per Task 3 [F2-6].
 * Features debounced query execution (fast typing sends one request per pause),
 * structured error states with retry capabilities, and instant playback triggering.
 */
import React, { useState, useEffect, useRef } from 'react'
import { Search, RotateCcw, Play, Plus, Loader2 } from 'lucide-react'
import type { Track } from '../types'
import { SAMPLE_TRACKS } from '../data/mockData'
import { usePlayer } from '../context/PlayerContext'

interface SearchUIProps {
  onSearchQuery?: (query: string) => Promise<Track[]>
}

export const SearchUI: React.FC<SearchUIProps> = ({ onSearchQuery }) => {
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [results, setResults] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [requestCount, setRequestCount] = useState<number>(0)

  const { playTrack, addToQueue } = usePlayer()
  const timerRef = useRef<any>(null)

  const executeSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([])
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    setRequestCount((c) => c + 1)

    try {
      if (onSearchQuery) {
        const data = await onSearchQuery(query)
        setResults(data)
      } else {
        // Default local filter
        await new Promise((r) => setTimeout(r, 60))
        const q = query.toLowerCase()
        const matched = SAMPLE_TRACKS.filter(
          (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
        )
        setResults(matched)
      }
    } catch (err: any) {
      setError(err?.message || 'Search service temporarily unavailable')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced input handler (Task 3 [F2-6]: fast typing = 1 request per pause)
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    if (searchTerm.trim()) {
      timerRef.current = setTimeout(() => {
        executeSearch(searchTerm)
      }, 250) // 250ms debounce pause
    } else {
      setResults([])
      setError(null)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [searchTerm])

  const handleRetry = () => {
    executeSearch(searchTerm)
  }

  return (
    <div style={{ width: '100%', maxWidth: '720px', margin: '0 auto' }}>
      {/* Search Input Bar */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <input
          data-testid="search-input"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search tracks, artists, genres..."
          className="input-glass"
          style={{
            paddingLeft: '44px',
            paddingRight: '40px',
            height: '48px',
            fontSize: '15px',
            borderRadius: 'var(--radius-pill)',
          }}
          aria-label="Search"
        />
        <Search
          size={18}
          style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-tertiary)',
            pointerEvents: 'none',
          }}
        />
        {isLoading && (
          <Loader2
            size={18}
            className="animate-spin"
            data-testid="search-loading"
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-tertiary)',
            }}
          />
        )}
      </div>

      <div data-testid="search-request-counter" style={{ display: 'none' }}>
        {requestCount}
      </div>

      {/* Error State with Retry Button */}
      {error && (
        <div
          data-testid="search-error-state"
          className="glass-panel"
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-inner)',
            borderColor: 'var(--color-danger)',
            backgroundColor: 'var(--color-danger-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '14px' }}>Search Failed</div>
            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', marginTop: '2px' }}>
              {error}
            </div>
          </div>
          <button
            data-testid="search-retry-button"
            onClick={handleRetry}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Search Results Display */}
      {results.length > 0 && (
        <div
          data-testid="search-results-list"
          style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          {results.map((track) => (
            <div
              key={track.id}
              data-testid={`search-result-${track.id}`}
              className="glass-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
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
                  <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '14px' }}>
                    {track.title}
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                    {track.artist}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  data-testid={`play-search-${track.id}`}
                  onClick={() => playTrack(track)}
                  className="btn-glass"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  aria-label={`Play ${track.title}`}
                >
                  <Play size={14} fill="#FFFFFF" /> Play
                </button>
                <button
                  onClick={() => addToQueue(track)}
                  className="btn-glass"
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                  aria-label={`Queue ${track.title}`}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
