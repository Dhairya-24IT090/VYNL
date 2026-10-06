/**
 * AI Playlist Generation Wizard per Task 11 [F9-5].
 * Enables prompt seed adjustments, real-time draft generation preview,
 * and seamless saving as a persistent playlist without leaving the flow.
 */
import React, { useState } from 'react'
import { Sparkles, Check, Save, Music } from 'lucide-react'
import type { Track } from '../types'
import { SAMPLE_TRACKS } from '../data/mockData'

const AVAILABLE_GENRES = ['Synthwave', 'Ambient', 'Electronic', 'Lo-Fi', 'Cyberpunk', 'Chillstep']
const MOODS = ['Deep Focus', 'Late Night Drive', 'High Energy', 'Meditative Calm']

export const GenerationWizard: React.FC<{ onSaveSuccess?: (playlist: any) => void }> = ({
  onSaveSuccess,
}) => {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Synthwave'])
  const [selectedMood, setSelectedMood] = useState<string>('Deep Focus')
  const [energyLevel, setEnergyLevel] = useState<number>(6)

  const [draftTitle, setDraftTitle] = useState<string>('AI Focus Flow')
  const [draftItems, setDraftItems] = useState<Track[]>([])
  const [draftId, setDraftId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [savedPlaylistId, setSavedPlaylistId] = useState<string | null>(null)

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    )
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setSavedPlaylistId(null)

    // Simulate AI synthesis
    await new Promise((r) => setTimeout(r, 200))

    const newDraftId = `draft-${Date.now()}`
    setDraftId(newDraftId)
    setDraftItems(SAMPLE_TRACKS.slice(0, 3))
    setDraftTitle(`${selectedMood} & ${selectedGenres.join('/')}`)
    setIsGenerating(false)
  }

  const handleSaveAsPlaylist = async () => {
    if (!draftId) return
    setIsSaving(true)

    // Simulate saving draft as persistent playlist (POST /v1/playlists with draft_id)
    await new Promise((r) => setTimeout(r, 150))
    const createdPlaylist = {
      id: `pl-${Date.now()}`,
      title: draftTitle,
      draft_id: draftId,
      version: 1,
      items: draftItems,
    }

    setSavedPlaylistId(createdPlaylist.id)
    setIsSaving(false)
    if (onSaveSuccess) onSaveSuccess(createdPlaylist)
  }

  return (
    <div
      data-testid="wizard-container"
      className="glass-panel"
      style={{ padding: '28px', maxWidth: '800px', margin: '0 auto' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <Sparkles size={22} style={{ color: 'var(--color-accent)' }} />
        <h2 className="font-display" style={{ fontSize: '20px', color: '#FFFFFF' }}>
          AI Playlist Generator
        </h2>
      </div>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
        Adjust generation seeds to tailor an AI-curated listening journey.
      </p>

      {/* Seed Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
        {/* Genre Selector */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', display: 'block', marginBottom: '8px' }}>
            Select Genres
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {AVAILABLE_GENRES.map((genre) => {
              const isSelected = selectedGenres.includes(genre)
              return (
                <button
                  key={genre}
                  data-testid={`genre-${genre}`}
                  onClick={() => toggleGenre(genre)}
                  className={isSelected ? 'btn-primary' : 'btn-glass'}
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                >
                  {genre} {isSelected && <Check size={13} />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Mood Selector */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', display: 'block', marginBottom: '8px' }}>
            Vibe & Mood
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {MOODS.map((mood) => {
              const isSelected = selectedMood === mood
              return (
                <button
                  key={mood}
                  data-testid={`mood-${mood}`}
                  onClick={() => setSelectedMood(mood)}
                  className={isSelected ? 'btn-primary' : 'btn-glass'}
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                >
                  {mood}
                </button>
              )
            })}
          </div>
        </div>

        {/* Energy Slider */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>Energy Level</label>
            <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>{energyLevel} / 10</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={energyLevel}
            onChange={(e) => setEnergyLevel(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: '#FFFFFF' }}
          />
        </div>
      </div>

      {/* Generate Action Button */}
      <button
        data-testid="generate-button"
        onClick={handleGenerate}
        disabled={isGenerating || selectedGenres.length === 0}
        className="btn-primary"
        style={{ width: '100%', height: '44px', marginBottom: '24px' }}
      >
        <Sparkles size={16} /> {isGenerating ? 'Synthesizing Audio Draft...' : 'Generate AI Draft'}
      </button>

      {/* Live Draft Preview & Save Workflow */}
      {draftId && (
        <div
          data-testid="draft-preview-panel"
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: '20px',
            marginTop: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF' }}>{draftTitle}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Draft #{draftId} • {draftItems.length} curated tracks
              </div>
            </div>

            <button
              data-testid="save-playlist-button"
              onClick={handleSaveAsPlaylist}
              disabled={isSaving || !!savedPlaylistId}
              className="btn-primary"
              style={{
                backgroundColor: savedPlaylistId ? 'var(--color-success)' : '#FFFFFF',
                color: savedPlaylistId ? '#FFFFFF' : '#0F0F0F',
                fontSize: '13px',
                padding: '8px 18px',
              }}
            >
              {savedPlaylistId ? (
                <>
                  <Check size={14} /> Saved as Playlist!
                </>
              ) : (
                <>
                  <Save size={14} /> Save as Playlist
                </>
              )}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {draftItems.map((track, i) => (
              <div
                key={track.id}
                data-testid={`draft-item-${track.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', width: '18px' }}>
                  {i + 1}
                </span>
                <Music size={16} opacity={0.6} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#FFFFFF' }}>{track.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{track.artist}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
