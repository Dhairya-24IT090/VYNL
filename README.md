# VYNL — Continuous Music Streaming Web Application

VYNL is a modern, high-performance continuous music streaming web application built with React and Vite. It combines uninterrupted audio playback, synchronized lyrics, cloud playlist curation, dynamic ambient backdrops, and an ultra-premium frosted glass user interface.

---

## Visual Design System & Aesthetics

The interface is inspired by state-of-the-art frosted glassmorphism, fluid responsive geometry, and bold typography:
- **Base Canvas**: Deep dark `#0F0F0F` canvas with dynamic ambient presets or custom user-uploaded backdrops.
- **Heavy Frosted Glass**: `rgba(255, 255, 255, 0.08)` surfaces with `1px rgba(255, 255, 255, 0.10)` borders and `10px`–`27px` backdrop blur filters.
- **Large Geometric Radii**: Panels `52px`–`62px`, cards `32px`, pill navigation `80px`, and circular controls `50%` round.
- **Notched Concave Cutouts**: Featured cards and the Now Playing panel feature concave notch cutouts cradling floating circular action buttons (favorite hearts, options).
- **Fanned Card Shelf**: Overlapping cards with smooth subtle rotations (`-10°`, `+4°`, `+4.5°`), drop shadows, bottom frosted info scrims, and circular play buttons.
- **Typography**: Urbanist (500 body, 600 headings) for UI typography and Zen Dots for brand headers.

---

## Responsive Behavior

VYNL is engineered using CSS Grid, Flexbox, and fluid units (`clamp()`, `dvh`, `safe-area-inset-*`) without rigid fixed widths or absolute layout positioning:

### Large Desktop (`>= 1280px`)
- **Left Floating Icon Rail**: Fixed at `24px` left (`76px` width, `var(--radius-rail)`), providing primary one-click icon routing (`Home`, `Discover`, `Playlists`, `Library`, Profile trigger).
- **Top Floating Pill Navigation**: Horizontally centered over main content (`var(--radius-pill-nav)`), displaying section tabs mapped to existing routes (`Home`, `Discover`, `Library`, `Playlists`).
- **Main Fluid Content**: Fluidly sized between the rail and right panel (`margin-left: 120px`, `margin-right: calc(var(--now-playing-panel-width) + 28px)`).
- **Docked Right Now Playing Panel**: Docked along the right viewport boundary (`width: clamp(360px, 28vw, 440px)`). Features full-bleed track artwork with top concave notch cutout cradling heart and options buttons, bottom frosted glass control surface, 64px white circular play/pause button, scrubber track, elapsed/remaining timestamps, and volume popover.
- **Integrated Inline Lyrics**: Seamlessly integrated inside the same Now Playing card. Toggling lyrics reveals synchronized lines with `@keyframes lyricsSlideUpReveal`, hides the top cover artwork, and moves the song title, artist, and action controls directly above the scrubber.
- **Fullscreen Lyrics Overlay**: Expands to `100vw` × `100dvh` with a dedicated bottom playback control cluster (scrubber, favorite heart, Add to Playlist modal trigger, skip prev/next, play/pause circle, and volume slider).
- **Reactive Lyrics Customizer**: Single-source-of-truth style synchronization ensuring 100% font and background wallpaper consistency between inline and fullscreen views, with user sliders for background blur (0px clear to 40px), darkness overlay (0% to 100%), and glow intensity.
- **Queue Drawer**: Opens cleanly at `right: calc(clamp(360px, 28vw, 440px) + 36px)`, perfectly positioned beside the docked player without obstruction.

### Tablet Landscape / Laptop (`1024px – 1279px`)
- **Icon Rail & Pill Nav**: Icon rail and top pill nav remain active.
- **Floating Bottom Music Bar**: The Now Playing panel transforms into a sleek floating glass bar at the bottom of the viewport with artwork, track title, artist, scrubber rail, and transport controls.
- **Drawers**: Queue and Lyrics panels open as elegant glass overlays with click-outside and Escape key dismissal.

### Small Tablet Portrait (`768px – 1023px`)
- **Layout Adaptation**: Left rail condenses; top pill navigation remains horizontally scrollable if needed.
- **Content Grids**: Content grids adjust to 2–3 columns; fanned featured cards scale down proportionally while maintaining legibility.
- **Playback Bar**: Floating glass bottom player bar with responsive layout adjustments.

### Mobile (`< 768px` down to `360px`)
- **Floating Bottom Tab Bar**: Left icon rail collapses into a floating bottom tab bar (`env(safe-area-inset-bottom)`) with touch-friendly 44x44px hit targets.
- **Docked Mini-Player**: A compact mini-player docks directly above the bottom navigation bar.
- **Expandable Full-Screen Sheet**: Tapping the mini-player smoothly expands into a full-screen playback sheet (`100dvh`) featuring the large artwork, scrubber, and transport controls.
- **Horizontal Scroll-Snap Carousel**: Fanned cards flatten rotation (`transform: none`) and convert into a touch scroll-snap carousel.
- **Modals & Drawers**: Dialogs (such as Add to Playlist) and lyrics automatically adapt into bottom sheets with safe-area insets.

---

## Development & Verification

```bash
# Start local development server
npm run dev

# Run production build
npm run build

# Run linter
npm run lint

# Run active test suites
npx vitest run tests/playlist_enhancements.test.tsx tests/player.test.tsx tests/now_playing.test.tsx tests/lyrics_sync.test.tsx tests/lyrics_screen.test.tsx tests/app_shell.test.tsx tests/search.test.tsx
```
