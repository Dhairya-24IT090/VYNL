/**
 * Autodiscovered background images for the Lyrics panel via Vite's glob import.
 */

const rawModules = import.meta.glob(
  '/src/assets/lyrics-backgrounds/*.{jpg,jpeg,png,webp,avif,gif}',
  { eager: true, query: '?url', import: 'default' }
);

function formatLabel(filename) {
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
  return nameWithoutExt
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function parseBackgrounds() {
  const list = Object.entries(rawModules).map(([path, url]) => {
    const filename = path.split('/').pop() || '';
    const id = filename
      .substring(0, filename.lastIndexOf('.'))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    return {
      id,
      label: formatLabel(filename),
      filename,
      url,
    };
  });

  list.sort((a, b) => a.label.localeCompare(b.label));
  return list;
}

export const discoveredBackgrounds = parseBackgrounds();

export const DEFAULT_BACKGROUND = {
  id: 'default',
  label: 'Default Gradient',
  url: null,
};

export const allLyricsBackgrounds = [DEFAULT_BACKGROUND, ...discoveredBackgrounds];

export function getBackgroundById(id) {
  if (!id || id === 'default') return DEFAULT_BACKGROUND;
  const match = discoveredBackgrounds.find((bg) => bg.id === id);
  return match || DEFAULT_BACKGROUND;
}
