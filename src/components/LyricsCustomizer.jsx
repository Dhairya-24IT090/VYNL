import React, { useEffect, useState } from 'react';
import { X, RotateCcw, Image, Type, Sliders, Check } from 'lucide-react';
import {
  LYRICS_FONTS,
  ensureGoogleFontsLoaded,
  getFontById,
} from '../config/lyricsFonts';
import {
  allLyricsBackgrounds,
  discoveredBackgrounds,
  getBackgroundById,
} from '../config/lyricsBackgrounds';

export const LyricsCustomizer = ({
  isOpen,
  onClose,
  style,
  updateStyle,
  resetToDefault,
  swatches,
}) => {
  const [activeTab, setActiveTab] = useState('font'); // 'font' | 'background' | 'effects'

  useEffect(() => {
    if (isOpen) {
      ensureGoogleFontsLoaded();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Group fonts by category
  const fontCategories = LYRICS_FONTS.reduce((acc, font) => {
    if (!acc[font.category]) acc[font.category] = [];
    acc[font.category].push(font);
    return acc;
  }, {});

  return (
    <div
      data-testid="lyrics-customizer"
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '64px',
        right: '16px',
        width: '340px',
        maxHeight: 'calc(100% - 80px)',
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-md, 12px)',
        backgroundColor: 'rgba(16, 16, 20, 0.95)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.12)',
        overflow: 'hidden',
      }}
      role="dialog"
      aria-label="Customize Lyrics Display"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>
          Customize Lyrics
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={resetToDefault}
            title="Reset to default settings"
            aria-label="Reset to default"
            data-testid="reset-style-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-tertiary, #888)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              padding: '4px 6px',
              borderRadius: '4px',
            }}
          >
            <RotateCcw size={12} />
            Reset
          </button>
          <button
            onClick={onClose}
            aria-label="Close customizer"
            data-testid="close-customizer-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-secondary, #aaa)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <button
          onClick={() => setActiveTab('font')}
          data-testid="tab-font"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 0',
            fontSize: '12px',
            fontWeight: activeTab === 'font' ? 600 : 400,
            color: activeTab === 'font' ? '#FFFFFF' : 'var(--color-text-tertiary, #888)',
            borderBottom: activeTab === 'font' ? '2px solid #FFFFFF' : '2px solid transparent',
            background: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          <Type size={14} />
          Fonts
        </button>
        <button
          onClick={() => setActiveTab('background')}
          data-testid="tab-background"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 0',
            fontSize: '12px',
            fontWeight: activeTab === 'background' ? 600 : 400,
            color: activeTab === 'background' ? '#FFFFFF' : 'var(--color-text-tertiary, #888)',
            borderBottom: activeTab === 'background' ? '2px solid #FFFFFF' : '2px solid transparent',
            background: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          <Image size={14} />
          Background
        </button>
        <button
          onClick={() => setActiveTab('effects')}
          data-testid="tab-effects"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 0',
            fontSize: '12px',
            fontWeight: activeTab === 'effects' ? 600 : 400,
            color: activeTab === 'effects' ? '#FFFFFF' : 'var(--color-text-tertiary, #888)',
            borderBottom: activeTab === 'effects' ? '2px solid #FFFFFF' : '2px solid transparent',
            background: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          <Sliders size={14} />
          Effects
        </button>
      </div>

      {/* Tab Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* TAB 1: FONTS */}
        {activeTab === 'font' && (
          <div data-testid="font-picker-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(fontCategories).map(([category, fonts]) => (
              <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--color-text-tertiary, #888)',
                  }}
                >
                  {category}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {fonts.map((f) => {
                    const isSelected = style.fontId === f.id;
                    return (
                      <button
                        key={f.id}
                        data-testid={`font-option-${f.id}`}
                        onClick={() => updateStyle({ fontId: f.id })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: isSelected
                            ? 'rgba(255, 255, 255, 0.12)'
                            : 'rgba(255, 255, 255, 0.03)',
                          border: isSelected
                            ? '1px solid rgba(255, 255, 255, 0.3)'
                            : '1px solid rgba(255, 255, 255, 0.06)',
                          color: '#FFFFFF',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 150ms ease',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #aaa)' }}>
                            {f.label}
                          </span>
                          <span
                            style={{
                              fontFamily: f.fallback,
                              fontSize: '16px',
                              lineHeight: 1.3,
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              color: isSelected ? style.color : '#FFFFFF',
                            }}
                          >
                            Feel the rhythm
                          </span>
                        </div>
                        {isSelected && <Check size={14} color="#FFFFFF" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: BACKGROUNDS */}
        {activeTab === 'background' && (
          <div data-testid="bg-picker-container" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary, #aaa)' }}>
                Select Background
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary, #888)' }}>
                {discoveredBackgrounds.length} custom image{discoveredBackgrounds.length === 1 ? '' : 's'}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
              }}
            >
              {allLyricsBackgrounds.map((bg) => {
                const isSelected = style.backgroundId === bg.id;
                return (
                  <button
                    key={bg.id}
                    data-testid={`bg-option-${bg.id}`}
                    onClick={() => updateStyle({ backgroundId: bg.id })}
                    style={{
                      height: '74px',
                      borderRadius: '8px',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: isSelected
                        ? '2px solid #FFFFFF'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      background: bg.url
                        ? 'none'
                        : 'linear-gradient(135deg, rgba(30, 30, 45, 0.9), rgba(15, 15, 22, 0.95))',
                      padding: 0,
                    }}
                  >
                    {bg.url ? (
                      <img
                        src={bg.url}
                        alt={bg.label}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          color: 'var(--color-text-secondary, #aaa)',
                          padding: '4px',
                          textAlign: 'center',
                        }}
                      >
                        Default Gradient
                      </div>
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.4)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: '6px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 500,
                          color: '#FFFFFF',
                          textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                        }}
                      >
                        {bg.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {discoveredBackgrounds.length === 0 && (
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-tertiary, #888)',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  lineHeight: 1.4,
                }}
              >
                Tip: Place custom wallpapers in{' '}
                <code style={{ color: '#fff', fontSize: '10px' }}>
                  src/assets/lyrics-backgrounds/
                </code>{' '}
                to see them automatically here!
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EFFECTS & COLORS */}
        {activeTab === 'effects' && (
          <div data-testid="effects-picker-container" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Text Color Picker & Swatches */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label
                  htmlFor="lyrics-color-input"
                  style={{ fontSize: '12px', color: 'var(--color-text-secondary, #aaa)' }}
                >
                  Text Color
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    id="lyrics-color-input"
                    type="color"
                    data-testid="lyrics-color-picker"
                    value={style.color}
                    onChange={(e) => updateStyle({ color: e.target.value })}
                    style={{
                      width: '24px',
                      height: '24px',
                      padding: 0,
                      border: 'none',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      background: 'none',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#fff', fontFamily: 'monospace' }}>
                    {style.color.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Swatches */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {swatches.map((hex) => (
                  <button
                    key={hex}
                    data-testid={`color-swatch-${hex}`}
                    onClick={() => updateStyle({ color: hex })}
                    aria-label={`Select color ${hex}`}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: hex,
                      border: style.color.toLowerCase() === hex.toLowerCase()
                        ? '2px solid #FFFFFF'
                        : '1px solid rgba(255, 255, 255, 0.2)',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Glow Intensity Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label
                  htmlFor="lyrics-glow-slider"
                  style={{ fontSize: '12px', color: 'var(--color-text-secondary, #aaa)' }}
                >
                  Glow Intensity
                </label>
                <span
                  data-testid="glow-value-indicator"
                  style={{ fontSize: '11px', color: '#fff', fontFamily: 'monospace' }}
                >
                  {style.glow}%
                </span>
              </div>
              <input
                id="lyrics-glow-slider"
                type="range"
                data-testid="glow-slider"
                min="0"
                max="100"
                value={style.glow}
                onChange={(e) => updateStyle({ glow: parseInt(e.target.value, 10) })}
                style={{
                  width: '100%',
                  accentColor: style.color || '#FFFFFF',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Background Dark Overlay Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label
                  htmlFor="lyrics-bg-opacity-slider"
                  style={{ fontSize: '12px', color: 'var(--color-text-secondary, #aaa)' }}
                >
                  Background Darkening
                </label>
                <span
                  data-testid="opacity-value-indicator"
                  style={{ fontSize: '11px', color: '#fff', fontFamily: 'monospace' }}
                >
                  {style.bgOpacity}%
                </span>
              </div>
              <input
                id="lyrics-bg-opacity-slider"
                type="range"
                data-testid="bg-opacity-slider"
                min="0"
                max="100"
                value={style.bgOpacity}
                onChange={(e) => updateStyle({ bgOpacity: parseInt(e.target.value, 10) })}
                style={{
                  width: '100%',
                  accentColor: '#FFFFFF',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Background Blur Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label
                  htmlFor="lyrics-bg-blur-slider"
                  style={{ fontSize: '12px', color: 'var(--color-text-secondary, #aaa)' }}
                >
                  Background Blur
                </label>
                <span
                  data-testid="blur-value-indicator"
                  style={{ fontSize: '11px', color: '#fff', fontFamily: 'monospace' }}
                >
                  {(style.bgBlur ?? 0) === 0 ? 'Clear (0px)' : `${style.bgBlur}px`}
                </span>
              </div>
              <input
                id="lyrics-bg-blur-slider"
                type="range"
                data-testid="bg-blur-slider"
                min="0"
                max="40"
                value={style.bgBlur ?? 0}
                onChange={(e) => updateStyle({ bgBlur: parseInt(e.target.value, 10) })}
                style={{
                  width: '100%',
                  accentColor: '#FFFFFF',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
