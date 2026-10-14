# DESIGN.md — VYNL Frontend Design & UI/UX Specifications

Comprehensive design system, UI component architecture, visual style guide, and page-by-page interaction specifications for the **VYNL** continuous music streaming web application.

---

## 1. Executive Summary & Design Philosophy

VYNL is built around the concept of **"Frosted Glass & Fluid Notches"** — a futuristic, dark-themed, architectural design language engineered for continuous music exploration and playback. The interface combines deep `#0F0F0F` canvas surfaces, heavy multi-layered frosted glass panels (`rgba(255, 255, 255, 0.08)` with blurs from `10px` to `27px`), very large geometric radii (`52px`–`62px` panels, `32px` cards, `80px` pill navigation), tactile concave notch cutouts cradling circular controls, and an overlapping 3-card fanned featured shelf.

### Core Design Pillars
1. **Continuous & Uninterrupted Audio Flow**: Audio playback never halts during page navigation, modal interaction, live search queries, queue reordering, or drawer toggles. The HTML5 audio element remains permanently mounted in `PlayerContext`.
2. **Heavy Architectural Glassmorphism**: Translucent frosted glass surfaces (`rgba(255, 255, 255, 0.08)`) with `1px rgba(255, 255, 255, 0.10)` borders and `-webkit-backdrop-filter: blur(10px - 27px)` produce tangible optical depth, complemented by solid-color fallbacks for low-power or non-supporting browsers.
3. **Sculpted Concave Notches**: Featured cards and the Now Playing panel feature concave circular cutout notches along their top perimeter, precision-engineered via scalable SVG masks and radial gradients (`mask: radial-gradient(circle 34px at 50% 0, transparent 0, transparent 31px, #000 32px)`) that cradle floating circular action buttons (favorite hearts, options) without layout hackery.
4. **Fanned Card Geometry**: Overlapping cards with organic rotational fanning (`-10°`, `+4°`, `+4.5°`), drop shadows (`15px 4px 14px rgba(0, 0, 0, 0.3)`), bottom frosted info scrims, and circular play buttons serve as the centerpiece shelf on the Home page.
5. **Fluid Responsive Tri-State Architecture**: Rather than fixed artboard approximations, the application responds fluidly using CSS Grid, Flexbox, and `clamp()` units:
   - **Large Desktop (`>= 1280px`)**: 4-column composition with left floating icon rail, top floating pill nav, fluid center content, and docked right Now Playing panel.
   - **Tablet / Laptop (`1024px - 1279px`)**: 3-column composition; Now Playing docks as a floating glass bottom bar.
   - **Small Tablet (`768px - 1023px`)**: Compact floating icon dock; scrollable top pill nav.
   - **Mobile (`< 768px` down to `360px`)**: Floating bottom tab bar, docked mini-player, full-screen expandable playback sheet (`100dvh`), and bottom-sheet modals with safe-area insets (`env(safe-area-inset-bottom)`).
6. **Deliberately Not Built (Out of Scope from Reference Mockup)**:
   - Nav tabs `"Artists"`, `"Albums"`, and `"Genres"` shown in the mockup do NOT exist in VYNL and were deliberately omitted; navigation strictly maps to existing routes: `Home`, `Discover`, `Library`, `Playlists`.
   - A standalone player shuffle toggle shown in the mockup is out of scope; playlist shuffle remains properly localized to the Playlists view where the Fisher-Yates algorithm operates.
   - Brand name remains **VYNL** (mockup name "WAVEN" is ignored).
   - Mockup album artwork is replaced with real track artwork and deterministic fallback placeholders.

---

## 2. Design System Tokens & Foundations

All design system tokens are centralized in `src/index.css` as CSS custom properties.

### 2.1 Color Palette

| Token | Value | Purpose |
| :--- | :--- | :--- |
| `--color-bg` | `#0F0F0F` | Global canvas background |
| `--color-glass-frosted` | `rgba(255, 255, 255, 0.08)` | Primary frosted panels, icon rail, pill nav |
| `--color-glass-subtle` | `rgba(255, 255, 255, 0.02)` | Track row backgrounds, subtle highlights |
| `--color-glass-chip` | `rgba(0, 0, 0, 0.20)` | Active navigation chips and button backdrops |
| `--color-glass-scrim` | `rgba(0, 0, 0, 0.04)` | Bottom scrim over featured cards |
| `--color-surface-glass` | `rgba(255, 255, 255, 0.05)` | Default glass surface container |
| `--color-surface-glass-hover` | `rgba(255, 255, 255, 0.09)` | Interactive glass hover state |
| `--color-surface-glass-active`| `rgba(255, 255, 255, 0.14)` | Active navigation links, pressed items |
| `--color-surface-card` | `rgba(22, 22, 26, 0.70)` | Structured card backgrounds |
| `--color-surface-overlay` | `rgba(15, 15, 15, 0.85)` | Full-screen modals and backdrop overlays |
| `--color-text-primary` | `#FFFFFF` | Primary headings, titles, active track names |
| `--color-text-secondary` | `rgba(255, 255, 255, 0.80)` | Subtitles, track row titles, descriptions |
| `--color-text-subtle` | `rgba(255, 255, 255, 0.60)` | Artist names, meta tags, secondary pills |
| `--color-text-tertiary` | `rgba(255, 255, 255, 0.45)` | Timestamps, metadata pills, inactive icons |
| `--border-glass` | `rgba(255, 255, 255, 0.10)` | Standard 1px glass borders |
| `--border-card-subtle` | `rgba(255, 255, 255, 0.20)` | Subtle card borders |
| `--border-card-prominent`| `rgba(255, 255, 255, 0.40)` | Front fanned card perimeter border |
| `--color-divider` | `rgba(255, 255, 255, 0.08)` | 1px horizontal track row dividers |
| `--color-accent` | `#FFFFFF` | Primary CTA contrast color & icons |
| `--color-danger` | `#EF4444` | Errors, delete actions, unliked heart state |
| `--color-danger-glass` | `rgba(239, 68, 68, 0.15)` | Error callout containers |
| `--color-success` | `#10B981` | Success confirmations, added badges |

### 2.2 Typography Hierarchy

Imported from Google Fonts in `index.html`:
- **Brand / Display Font**: `'Zen Dots', cursive, sans-serif`
  - Used for brand wordmarks and select display headers. Letter spacing: `0.04em`–`0.06em`.
- **Interface & Content Font**: `'Urbanist', sans-serif`
  - Weights: `400` (regular), `500` (medium), `600` (semi-bold), `700` (bold).

| Hierarchy Level | Font Family | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Title** | Urbanist | `clamp(28px, 2.5vw, 36px)` | 600 | 1.2 | Docked Now Playing title, major page banners |
| **Card Title** | Urbanist | `clamp(18px, 1.8vw, 22px)` | 600 | 1.2 | Featured fanned cards (uppercase) |
| **Row Title** | Urbanist | `20px` | 500 | 1.4 | 84px track row song titles |
| **Section Nav**| Urbanist | `18px` | 600 | 1.2 | Top floating pill navigation tabs |
| **Row Duration**| Urbanist | `16px` | 500 | 1.2 | Track row duration timestamps |
| **Card Meta** | Urbanist | `14px` | 500 | 1.2 | Featured card artist names |
| **Timeline Time**| Urbanist | `12px` | 400 | 1.2 | Scrubber elapsed & remaining time labels |
| **Sub Meta** | Urbanist | `12px` | 400 | 1.2 | "Single • year • songs" meta tags |
| **Badge Tag** | Urbanist | `10px` | 500 | 1.2 | "New release" uppercase pill badges |

### 2.3 Radii, Blur, & Elevation Tokens

```css
/* Corner Radii */
--radius-panel-lg:  62px;    /* Docked Now Playing panel */
--radius-panel:     52px;    /* Tall tracklist panels, glass surfaces */
--radius-pill-nav:  80px;    /* Top floating pill navigation container */
--radius-rail:      60px;    /* Left floating icon rail */
--radius-chip:      40px;    /* Active navigation pill chips */
--radius-card:      32px;    /* Featured cards, playlist cards, modal cards */
--radius-badge:     20px;    /* "New release" metadata pills */
--radius-circle:    50%;     /* Circular action buttons, artwork */
--radius-pill:      9999px;  /* Scrubber tracks, pill buttons */

/* Frosted Glass Blurs */
--blur-glass:        10px;   /* Default frosted surface blur */
--blur-rail:         17px;   /* Left vertical icon rail blur */
--blur-pill:         27px;   /* Top pill navigation blur */

/* Elevation Shadows */
--shadow-card:       0 16px 40px -8px rgba(0, 0, 0, 0.6);
--shadow-fan:        15px 4px 14px rgba(0, 0, 0, 0.3);
--shadow-floating:   0 24px 60px -12px rgba(0, 0, 0, 0.8);
```

### 2.4 Motion & Transitions

- `--duration-fast`: `150ms` (hover states, icon color transitions)
- `--duration-normal`: `250ms` (drawer transitions, card hovering)
- `--duration-slow`: `400ms` (modal entrances/exits, panel slides)
- `--ease-spring`: `cubic-bezier(0.16, 1, 0.3, 1)` (snappy interactive transforms)
- `--ease-smooth`: `cubic-bezier(0.4, 0, 0.2, 1)` (opacity, background crossfades)
- **Reduced Motion Fallback**: `@media (prefers-reduced-motion: reduce)` zeroes out animation durations, resets fanned card rotations to `0deg`, and sets autoscroll to immediate `auto`.

---

## 3. Global Layout Architecture & Persistent Shell

The application shell is rendered in `src/App.jsx` and provides persistent wrappers: `AuthProvider`, `PlayerProvider`, and `BackdropProvider`.

### 3.1 Desktop Shell (`>= 1280px`)

```
+-------------------------------------------------------------------------------------------------------------+
|  VYNL App Shell (Desktop >= 1280px)                                                                        |
|                                                                                                             |
|  [VYNL] Logo                 +------------------------------------------------------+                       |
|  (left: 28px)                | Top Pill Nav: [Home] [Discover] [Playlists] [Library]|                       |
|                              +------------------------------------------------------+                       |
|                                                                                                             |
|  +--------------------+  +----------------------------------------------------------+  +------------------+ |
|  | Floating Icon Rail |  | Fluid Main Content (app-main-content)                    |  | Docked Now       | |
|  | (left: 24px, 76px) |  | (margin-left: 120px, margin-right: calc(width + 28px))   |  | Playing Panel    | |
|  |                    |  |                                                          |  | (clamp 360-440px)| |
|  | - [Home]           |  | - Fanned Featured Cards Shelf                            |  |                  | |
|  | - [Discover]       |  |   * Left: -10° rot, scrim, 50px play circle              |  | - Top Concave    | |
|  | - [Playlists]      |  |   * Center: front card, +4° rot                          |  |   Notch (heart,  | |
|  | - [Library]        |  |   * Right: +4.5° rot, scrim, 50px play circle            |  |   options/vol)   | |
|  |                    |  |                                                          |  | - Full Artwork   | |
|  |                    |  | - Tall Glass Tracklist (52px radius)                     |  | - Glass Scrim    | |
|  |                    |  |   * 84px rows, 60px circle art, 20px title, 16px time    |  | - Large Title    | |
|  | - [Profile / Auth] |  |   * Circular heart + options (...)                       |  | - Scrubber Track | |
|  +--------------------+  +----------------------------------------------------------+  | - 64px Play Cir. | |
|                                                                                        +------------------+ |
+-------------------------------------------------------------------------------------------------------------+
                                                             ^
                                                             |
                 [QueueDrawer] / [LyricsPanel] open at right: calc(panel_width + 36px)
```

### 3.2 Tablet Shell (`1024px – 1279px`)

```
+-----------------------------------------------------------------------------------------+
|  VYNL App Shell (Tablet 1024px - 1279px)                                               |
|                                                                                         |
|  [VYNL] Logo                 +-------------------------------------------------------+  |
|                              | Top Pill Nav: [Home] [Discover] [Playlists] [Library] |  |
|                              +-------------------------------------------------------+  |
|                                                                                         |
|  +--------------------+  +-----------------------------------------------------------+  |
|  | Floating Icon Rail |  | Main Content                                              |  |
|  | (left: 24px)       |  | (margin-left: 120px, padding-bottom: 140px)               |  |
|  +--------------------+  +-----------------------------------------------------------+  |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | Floating Glass Bottom Music Bar (84px, card radius, 16px from bottom)             |  |
|  | [Art 54px] [Title + Artist]  |  [Scrubber Rail]  |  [Play/Pause 42px, Aux Btns]   |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
```

### 3.3 Mobile Shell (`< 768px`)

```
+-----------------------------------------------------------------------------------------+
|  VYNL App Shell (Mobile < 768px)                                                        |
|                                                                                         |
|  Main Content:                                                                          |
|  - Fanned cards convert to horizontal scroll-snap carousel (transform: none)            |
|  - Track rows stack cleanly with 44px minimum hit targets                               |
|  - Modals adapt to bottom sheets (env(safe-area-inset-bottom))                          |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | Docked Glass Mini-Player (60px height, docked directly above bottom nav bar)      |  |
|  | [Thumb 42px] [Title + Artist] [Play/Pause 38px] (Tap to expand full-screen sheet)  |  |
|  +-----------------------------------------------------------------------------------+  |
|  | Floating Glass Bottom Navigation Tab Bar (60px height, 30px radius)               |  |
|  | [Home]       [Discover]       [Playlists]       [Library]       [Profile]         |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
```

---

## 4. Key Component Specifications

### 4.1 Icon Rail (`Navigation.jsx` — Desktop Aside)
- **Positioning**: Fixed at `left: 24px`, `top: 90px`, width `76px`, height `460px`, `z-index: 65`.
- **Aesthetics**: `border-radius: var(--radius-rail)` (60px), background `var(--color-glass-frosted)`, `backdrop-filter: blur(17px)`.
- **Items**:
  - `Home` (`/`), `Discover` (`/discover`), `Playlists` (`/playlists`), `Library` (`/library`).
  - Active chip: `48px` circular container, background `var(--color-glass-chip)` (`rgba(0, 0, 0, 0.2)`), border `1px solid rgba(255, 255, 255, 0.15)`, white icon.
  - Inactive chip: Transparent, icon color `rgba(255, 255, 255, 0.7)`.
- **Bottom Profile Trigger**:
  - `46px` circular avatar button with fallback `User` icon.
  - Toggles floating glass profile popover with username, `● Session Active`, and sign-out or guest sign-in CTA.

### 4.2 Pill Navigation (`Navigation.jsx` — Top Header)
- **Positioning**: Fixed header centered over content (`top: 20px`, `left: 120px`, `right: clamp(380px, 30vw, 460px)` on desktop).
- **Aesthetics**: `border-radius: var(--radius-pill-nav)` (80px), background `var(--color-glass-frosted)`, `backdrop-filter: blur(27px)`, `1px solid var(--color-border)`.
- **Route Mapping**: Mapped strictly to existing routes: `Home`, `Discover`, `Library`, `Playlists`.
- **Active State**: Active tab rendered with dark rounded chip (`background: var(--color-glass-chip)`, `padding: 10px 24px`, font `15px`/`600`, color `#FFFFFF`).

### 4.3 Notched Card (`TrackCard.jsx`)
- **Dimensions**: `250px` width, `338px` height, `border-radius: var(--radius-card)` (32px).
- **Top Concave Notch Cutout**:
  - Precision radial mask: `-webkit-mask: radial-gradient(circle 34px at 50% 0, transparent 0, transparent 31px, #000 32px)`.
  - Floating circular action button (`.notched-cradle-btn`, 44px) positioned at top center cradling the favorite heart.
- **Bottom Frosted Info Scrim**:
  - Glass overlay (`rgba(0, 0, 0, 0.45)`, `backdrop-filter: blur(10px)`) across bottom `140px`.
  - Uppercase track title (`font-weight: 600`, `22px`), artist (`14px`), and conditional meta (`Single • year • songs`).
  - `50px` white circular play button (`background: #FFFFFF`, black triangle icon).
- **Conditional Badging**: "New release" badge rendered only when track release date or metadata supports it.

### 4.4 Fanned Featured Shelf (`HomePage.jsx`)
- Rendered on the Home page for the top 3 tracks of the featured shelf:
  - **Left Card**: `transform: rotate(-10deg) translateY(12px)`, `z-index: 1`.
  - **Center Card**: `transform: rotate(4deg)`, `z-index: 3`, prominent border `1px solid rgba(255, 255, 255, 0.4)`, drop shadow `15px 4px 14px rgba(0, 0, 0, 0.3)`.
  - **Right Card**: `transform: rotate(4.5deg) translateY(10px)`, `z-index: 2`, `margin-left: -40px`.
- On mobile `< 768px`, rotation is disabled (`transform: none`) and cards snap smoothly in a touch carousel.

### 4.5 Standardized 84px Track Rows (`TrackRow.jsx`)
- **Height**: Exactly `84px` with `1px solid rgba(255, 255, 255, 0.08)` bottom divider.
- **Components**:
  1. **Artwork**: `60px` circular image with deterministic fallback placeholder.
  2. **Active Indicator**: Left `4px` vertical white bar (`border-radius: 0 11px 11px 0`) when active/playing.
  3. **Title & Artist Stack**: Song title (`20px`, Urbanist 500), artist name (`12px`, Urbanist 500, `rgba(255, 255, 255, 0.6)`).
  4. **Duration**: Right-aligned `16px` timestamp (`#FFFFFF`).
  5. **Action Cluster**:
     - Circular `Heart` like/unlike button (`44px`, `50%` radius).
     - Circular `...` options button (`44px`) opening an accessible popup menu (`role="menu"`, Escape dismiss) with Queue, Playlist Modal, and Radio options.

### 4.6 Unified Now Playing Panel (`NowPlayingBar.jsx`)
Single persistent component adapting fluidly across viewports:
- **Desktop `>= 1280px` (Docked Right Panel)**:
  - Docked at `top: 20px`, `right: 20px`, `bottom: 20px`, width `clamp(360px, 28vw, 440px)`, `border-radius: var(--radius-panel-lg)` (62px).
  - **Normal Mode**:
    - Top notched cutout cradling favorite heart and options button with volume popover.
    - Full-bleed track artwork with top radial cutout mask.
    - Bottom frosted glass control surface (`rgba(0, 0, 0, 0.45)`, `backdrop-filter: blur(24px)`).
    - Large uppercase title (`clamp(28px, 2.5vw, 36px)`), artist, likes count.
    - 6px scrubber rail with click-to-seek and keyboard arrow support.
    - Transport cluster with `Queue`, `SkipBack`, `64px` white circular Play/Pause button, `SkipForward`, and `Mic2` lyrics toggle.
  - **Integrated Inline Lyrics Mode**:
    - Toggling lyrics smoothly animates lyrics upward into view (`@keyframes lyricsSlideUpReveal`) to take over the main card area.
    - Cover art and top notch cradle are hidden (`display: none`), eliminating cluttered top banners.
    - Song title (`15px bold`) and artist (`12px secondary`) are cleanly repositioned inside `.player-lyrics-bottom-meta-row` directly above the scrubber rail.
    - Aligned to the right of the title/artist row is an action cluster featuring the favorite Heart button, Lyrics Theme Customizer trigger (`Palette`), Fullscreen Expand trigger (`Maximize2`), and options/volume menu (`MoreHorizontal`).
    - The synchronized lyrics container features user-customized font typography, active line glow, crystal-clear background by default (`bgBlur: 0`), darkening overlay, click-to-seek, smooth auto-scroll, and "Jump to current" floating resume button.
- **Tablet `1024px – 1279px` (Floating Glass Bar)**:
  - Height `84px`, floating `16px` above bottom viewport.
  - Artwork thumbnail (`54x54px`), title, artist, scrubber rail, transport controls.
- **Mobile `< 768px` (Mini-Player & Full-Screen Sheet)**:
  - Compact `60px` mini-player docked above bottom tab bar.
  - Tap expands into a full-screen sheet (`100dvh`, `z-index: 200`) with large artwork, scrubber, and 60px play circle, with inline lyrics support matching desktop.

### 4.7 Queue Drawer (`QueueDrawer.jsx`) & Fullscreen Lyrics Overlay (`LyricsPanel.jsx`)
- **Queue Drawer**: Positioned at `right: calc(clamp(360px, 28vw, 440px) + 36px)` on desktop, clearing the docked player without obstruction. On smaller screens, opens as centered/right glass overlay sheet with clean backdrop dismiss.
- **Dedicated Fullscreen Lyrics Overlay**: Expands across the full viewport (`100vw` × `100dvh`) with responsive header, auto-scrolling lyrics lines, and a dedicated bottom playback control bar (scrubber, heart, Add to Playlist modal trigger, skip back, 56px circular play/pause, skip forward, and volume slider).

---

## 5. Comprehensive Page-by-Page Specifications

All underlying routes, API calls, state contexts, and business flows remain **100% identical and unchanged**.

### 5.1 Home Page (`HomePage.jsx` — `/`)
- **Fanned Featured Shelf**: Showcases the top 3 tracks in the fanned card rotation.
- **Track Counts Preserved**: All 12 Trending tracks, 12 For You tracks, and 8 Recently Played tracks are rendered in tall frosted glass panels (`border-radius: var(--radius-panel)`) utilizing the new `TrackRow` layout.
- **Onboarding Banner**: Rendered conditionally for new users, linking to `/onboarding`.

### 5.2 Discover Page (`DiscoverPage.jsx` & `SearchUI.jsx` — `/discover`)
- **Search Bar**: Centered pill input (`height: 54px`, `border-radius: var(--radius-pill)`, `padding-left: 52px`).
- **Debounced Search**: `250ms` input debounce prior to hitting streaming endpoint.
- **Results Container**: Tall frosted glass panel with 84px track rows, circular artwork, play/queue/playlist actions, and error retry state (`data-testid="search-retry-button"`).
- **Active Loading State**: Animated spinning circle (`.animate-spin, .spin`) indicating active fetching without static progress stalls.

### 5.3 Library Page (`LibraryPage.jsx` — `/library`)
- **Liked Tracks View**: Tall frosted glass panel with 84px track rows displaying saved tracks.
- **Optimistic Heart Updates**: Toggling heart updates local UI instantly without page reload.
- **Unauthenticated Gate**: Centered glass card directing guests to sign in.

### 5.4 Playlists Gallery (`PlaylistsPage.jsx` — `/playlists`)
- **Playlist Cards**: Restyled with `32px` card radii, frosted glass gradient, quick-action pill Play and Shuffle buttons, and circular glass trash button (`btn-circle`).
- **Inline Creation**: Expandable glass form for naming and creating playlists.

### 5.5 Playlist Detail (`PlaylistDetailPage.jsx` — `/playlists/:id`)
- **Header**: Glass card with playlist title, track count, Play All, Shuffle, and "Add Songs" drawer trigger.
- **Expandable Search Drawer**: Slide-in debounced search panel for instant 1-click additions.
- **Tracklist Panel**: `52px` panel radius with indexed track rows. Each row features a `52x52px` circular artwork thumbnail with a centered `Play` icon overlay (`backgroundColor: rgba(0, 0, 0, 0.4)`), sleek title and artist text, and a circular translucent glass trash button (`btn-circle`) free of opaque white square backgrounds.
- **5-Song Sliding Recommendations Shelf**: Distinct frosted glass container (`border-radius: var(--radius-panel)`) featuring refresh rotation, 1-click addition, and automatic slot refill.

### 5.6 Authentication (`LoginPage.jsx` — `/sign-in`)
- **Card**: `52px` panel radius frosted glass card with Zen Dots brand header and Google OAuth trigger.

### 5.7 Onboarding Quiz (`OnboardingPage.jsx` — `/onboarding`)
- **Genre Cards**: `32px` card radius interactive glass cards with circular check badges and minimum 3-genre calibration threshold.

---

## 6. Synchronized Lyrics Suite & Customizer Architecture

The lyrics engine (`useLyrics.js`, `lrc.js`, `lyricsLanguage.js`, `LyricsPanel.jsx`, `LyricsCustomizer.jsx`, `useLyricsStyle.js`) provides an ultra-responsive, synchronized visual singing experience:
- **RAF Time Tracking**: `requestAnimationFrame` binary search active line tracking synchronized with `getAudioCurrentTime()`.
- **Autoscroll & Manual Override**: Autoscroll centers the active line; manual scroll pauses auto-follow for 3 seconds with a floating "Jump to current" action button.
- **Interactive Click-to-Seek**: Clicking any synced lyric line immediately seeks audio playback to that exact timestamp without interrupting audio stream.
- **Language Filter**: Rejects lyrics with >15% non-Latin characters to prevent encoding glitches.
- **Plain Lyrics Fallback**: Non-synced lyrics use character-weighted estimation marked with `"Estimated sync"`.
- **Global Reactive Store (`useLyricsStyle.js`)**: Single source of truth with an in-memory listener bus and cross-tab/cross-component `storage` event broadcast. Guarantees 100% font and background wallpaper consistency across both inline and fullscreen lyrics screens without desynchronization.
- **User-Controllable Effects & Backgrounds**:
  1. **Background Wallpaper**: Selection from curated wallpapers or current track artwork.
  2. **Background Blur (`bgBlur`)**: Slider from `0px` (Crystal Clear, default) to `40px` (Heavy Blur).
  3. **Darkness Overlay (`bgOpacity`)**: Slider from `0%` to `100%` darkness.
  4. **Glow Intensity (`glow`)**: Multi-layered text-shadow glow for the active lyric line.
  5. **Font Palette**: 30 hand-curated Google Fonts dynamically loaded and rendered.

---

## 7. Dynamic Backdrops & Custom Uploads (`BackdropContext.jsx`)

- **Canvas Presets**: Obsidian Glow (Default), Aurora Haze, Velvet Dusk, Monochrome Glass.
- **Client-Side Binary Validation**: Custom image uploads enforce a strict 5 MB cap, MIME whitelist, and 8-byte magic byte verification (PNG, JPEG, WebP) to reject disguised non-image files.

---

## 8. Full Responsive Matrix (360px – 2560px)

| Viewport Width | Primary Navigation | Now Playing Player | Featured Cards | Content Layout |
| :--- | :--- | :--- | :--- | :--- |
| **Ultra-Wide (`>= 1920px`)** | Left Icon Rail (76px) + Top Pill Nav | Docked Right Panel (440px wide) | 3-Card Fanned Shelf | Max content width fluid, centered |
| **Large Desktop (`1280px – 1919px`)**| Left Icon Rail (76px) + Top Pill Nav | Docked Right Panel (clamp 360-440px)| 3-Card Fanned Shelf | Margins: L 120px, R calc(width + 28px) |
| **Tablet Landscape (`1024px – 1279px`)**| Left Icon Rail (76px) + Top Pill Nav | Floating Glass Bottom Bar (84px) | 3-Card Fanned Shelf (scaled) | Margin L 120px, R 24px |
| **Tablet Portrait (`768px – 1023px`)** | Compact Floating Dock | Floating Glass Bottom Bar | 3-Card Shelf (reduced rotation)| Multi-column grids (2–3 cols) |
| **Mobile (`360px – 767px`)** | Floating Bottom Tab Bar (60px) | Docked Mini-Player (Tap -> 100dvh Sheet)| Touch-Snap Carousel (0° rot) | Single column, bottom-sheet modals |

### Touch & Performance Rules
- **Hit Targets**: Minimum `44x44px` touch bounding boxes on all interactive buttons.
- **Hover Isolation**: All hover transformations scoped inside `@media (hover: hover)`.
- **Low-Power Devices**: Blur layers optimized and reduced under 768px or under `@media (prefers-reduced-transparency)`.
- **CLS Prevention**: All artwork has explicit `aspect-ratio` and dimension definitions to prevent cumulative layout shift.

---

## 9. Accessibility & UX Quality Standards

1. **Semantic HTML Structure**:
   - Navigation lives within `<aside aria-label="Primary Icon Navigation">` and `<nav aria-label="Section Navigation">`.
   - Main content enclosed within `<main className="app-main-content">`.
   - Now Playing Bar enclosed within `<footer aria-label="Now Playing Bar" role="contentinfo">`.
   - Modals and drawers use `role="dialog"` or `role="menu"` with Escape key dismissal.
2. **Keyboard Navigability**:
   - Visible `:focus-visible` styling (`outline: 2px solid #FFFFFF`, `outline-offset: 3px`).
   - Scrubber track supports click-to-seek and keyboard arrows.
3. **Contrast Compliance**:
   - Deep canvas `#0F0F0F` with dark backing scrims guarantees WCAG AA contrast ratio (> 4.5:1) for all text.
4. **Reduced Motion**:
   - `@media (prefers-reduced-motion: reduce)` zeroes out animation durations, removes rotational fanning from cards, and disables spring physics.
