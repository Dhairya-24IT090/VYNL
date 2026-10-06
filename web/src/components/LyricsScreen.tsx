/**
 * Fullscreen Synchronized Lyrics Screen per Tasks 27, 28, 29, 30 [F13-3, F14-1, F14-2-b, F14-4].
 * Parses LRC lyrics, highlights active line instantly upon seeking (<50ms),
 * renders on accessible glass backdrops, and supports custom backdrop uploads with magic byte validation.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Image, Upload, AlertCircle } from 'lucide-react'
import type { LyricLine, Track } from '../types'
import { usePlayer } from '../context/PlayerContext'
import { useBackdrop } from '../context/BackdropContext'

export function parseLrc(lrcText?: string): LyricLine[] {
  if (!lrcText) return []
  const lines = lrcText.split('\n')
  const result: LyricLine[] = []

  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/

  lines.forEach((line, index) => {
    const match = line.match(timeRegex)
    if (match) {
      const minutes = parseInt(match[1], 10)
      const seconds = parseInt(match[2], 10)
      const millis = parseInt(match[3].padEnd(3, '0'), 10)
      const totalSeconds = minutes * 60 + seconds + millis / 1000
      const text = match[4].trim()

      if (text) {
        result.push({
          id: `line-${index}`,
          time_seconds: totalSeconds,
          text,
        })
      }
    }
  })

  return result.sort((a, b) => a.time_seconds - b.time_seconds)
}

export const LyricsScreen: React.FC<{ overrideTrack?: Track }> = ({ overrideTrack }) => {
  const { currentTrack: contextTrack, progress, seek } = usePlayer()
  const { activeBackdrop, presets, selectBackdrop, uploadCustomBackdrop } = useBackdrop()

  const track = overrideTrack || contextTrack
  const parsedLyrics = useMemo(() => parseLrc(track?.lyrics), [track?.lyrics])

  const [activeLineId, setActiveLineId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const activeLineRef = useRef<HTMLDivElement | null>(null)

  // Fast lyric line matching (<50ms upon seek) per Task 27 [F13-3]
  useEffect(() => {
    if (parsedLyrics.length === 0) {
      setActiveLineId(null)
      return
    }

    let currentActive: LyricLine | null = null
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (progress >= parsedLyrics[i].time_seconds) {
        currentActive = parsedLyrics[i]
      } else {
        break
      }
    }

    if (currentActive && currentActive.id !== activeLineId) {
      setActiveLineId(currentActive.id)
    }
  }, [progress, parsedLyrics, activeLineId])

  // Scroll active line into view smoothly
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [activeLineId])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)
    const result = await uploadCustomBackdrop(file)
    if (!result.success) {
      setUploadError(result.error || 'Upload rejected')
    }
  }

  return (
    <div
      data-testid="lyrics-screen"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 'calc(100vh - 120px)',
        borderRadius: 'var(--radius-xl)',
        background: activeBackdrop.background,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '36px 20px',
        color: activeBackdrop.textColor || '#FFFFFF',
        transition: 'background 400ms ease',
      }}
    >
      {/* Backdrop Switcher Toolbar (Task 28 [F14-1] & Task 29 [F14-2-b]) */}
      <div
        data-testid="backdrop-toolbar"
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 16px',
          marginBottom: '32px',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Image size={15} />
          <span style={{ fontSize: '12px', fontWeight: 600 }}>Backdrops:</span>
        </div>

        {presets.map((preset) => (
          <button
            key={preset.id}
            data-testid={`backdrop-${preset.id}`}
            onClick={() => selectBackdrop(preset)}
            className={activeBackdrop.id === preset.id ? 'btn-primary' : 'btn-glass'}
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            {preset.name}
          </button>
        ))}

        <label
          data-testid="custom-backdrop-label"
          className="btn-glass"
          style={{ padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}
        >
          <Upload size={12} /> Custom
          <input
            data-testid="custom-backdrop-input"
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {uploadError && (
        <div
          data-testid="upload-error-banner"
          className="glass-panel"
          style={{
            borderColor: 'var(--color-danger)',
            backgroundColor: 'var(--color-danger-glass)',
            color: '#FFFFFF',
            padding: '8px 16px',
            fontSize: '12px',
            borderRadius: 'var(--radius-pill)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <AlertCircle size={14} /> {uploadError}
        </div>
      )}

      {/* Track Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1
          data-testid="lyrics-track-title"
          className="font-display"
          style={{ fontSize: '24px', fontWeight: 700 }}
        >
          {track?.title || 'No Track Loaded'}
        </h1>
        <p
          data-testid="lyrics-track-artist"
          style={{ fontSize: '14px', opacity: 0.7, marginTop: '4px' }}
        >
          {track?.artist || 'Unknown Artist'}
        </p>
      </div>

      {/* Synchronized Lyrics Container */}
      <div
        data-testid="lyrics-scroll-container"
        style={{
          width: '100%',
          maxWidth: '680px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          padding: '60px 0',
          overflowY: 'auto',
        }}
      >
        {parsedLyrics.length === 0 ? (
          <div style={{ opacity: 0.5, fontSize: '16px', textAlign: 'center', marginTop: '60px' }}>
            No synchronized lyrics available for this track.
          </div>
        ) : (
          parsedLyrics.map((line) => {
            const isActive = line.id === activeLineId
            return (
              <div
                key={line.id}
                ref={isActive ? activeLineRef : null}
                data-testid={`lyric-line-${line.id}`}
                onClick={() => seek(line.time_seconds)}
                style={{
                  fontSize: isActive ? '24px' : '17px',
                  fontWeight: isActive ? 700 : 400,
                  opacity: isActive ? 1 : 0.4,
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                }}
              >
                {line.text}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
