import React, { useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { parseLrc, findActiveLineIndex } from '../utils/lrc';

export { parseLrc };

export const LyricsScreen = ({ overrideTrack }) => {
  const { currentTrack: activeTrack, progress, seek } = usePlayer();
  const track = overrideTrack || activeTrack;

  const lines = useMemo(() => {
    if (!track?.lyrics) return [];
    return parseLrc(track.lyrics);
  }, [track?.lyrics]);

  const activeIndex = useMemo(() => {
    return findActiveLineIndex(lines, progress);
  }, [lines, progress]);

  if (!lines || lines.length === 0) {
    return (
      <div data-testid="lyrics-screen" style={{ padding: '24px', textAlign: 'center' }}>
        <p>No synchronized lyrics available for this track.</p>
      </div>
    );
  }

  return (
    <div data-testid="lyrics-screen" style={{ padding: '24px' }}>
      <h2 data-testid="lyrics-track-title">{track?.title}</h2>
      <h3 data-testid="lyrics-track-artist">{track?.artist}</h3>

      <div style={{ marginTop: '20px' }}>
        {lines.map((line, idx) => {
          const isActive = activeIndex === idx;
          return (
            <div
              key={`${line.time}-${idx}`}
              data-testid={`lyric-line-line-${idx}`}
              onClick={() => seek(line.time)}
              style={{
                opacity: isActive ? 1 : 0.4,
                cursor: 'pointer',
                padding: '8px 0',
                transition: 'opacity 50ms ease',
              }}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};
