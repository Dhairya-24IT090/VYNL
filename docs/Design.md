# VYNL — Design.md

**Product:** VYNL — a dark-themed, glassmorphic music streaming web app
**Source mockup:** Figma — *hero-pack-2*, frame "Desktop - 171" (node 1-341)
**Canvas:** 1440 × 1024 (desktop reference frame)
**Prepared by:** Senior Frontend / UI-UX documentation pass, reverse-engineered from exported Figma CSS

> Note on branding: the exported layer named the wordmark "WAVEN" (Zen Dots, 30px, uppercase). Per project brief the product is named **VYNL**. This document keeps the wordmark's *typographic treatment* (font, weight, size, letter-case) but all copy below uses **VYNL** as the brand name.

---

## 1. Design Philosophy

VYNL is a full-bleed, immersive "now playing" experience rather than a conventional list-first music app. The layout behaves like a physical desk: a large hero album cover sits center-right, playback controls float beneath it, a stack of "new release" cards fans out behind it like scattered vinyl sleeves, and the queue lives as a translucent panel on the left. Chrome (nav, pills, panels) is deliberately near-invisible — glass surfaces at 2–8% white opacity — so artwork and color carry the visual weight.

Core principles:

1. **Artwork-first.** UI chrome is translucent/low-contrast; imagery supplies color and energy.
2. **Glassmorphism as structure, not decoration.** Blur + low-opacity fills are used to *group* content (panels, pills, sidebar), not just for flourish.
3. **Soft geometry.** Extreme corner radii (32–80px, up to fully pill-shaped) on every container — no sharp edges anywhere in the UI.
4. **Floating, tactile album art.** Rotated, stacked cards (±4°–11°) with drop shadows imply a physical stack of records the user can "browse."
5. **Minimal text hierarchy.** Two typefaces, three text opacities, no more than 3 sizes per module.

---

## 2. Layout & Canvas

| Region | Approx. bounds (x, y, w, h) | Purpose |
|---|---|---|
| Sidebar (rail nav) | 0, 256 (vert. centered), 100 × 512 | Primary navigation, pill-shaped, floats mid-left |
| Wordmark | 42, 50 | Brand mark, top-left |
| Floating release stack | 75–870, 65–403 | 3 overlapping "new release" cards |
| Hero player card | 870, 144, 550 × 860 | Full-height cover art for the currently playing track |
| Now-playing glass panel | 870, 746, 550 × 258 | Overlaps bottom of hero card; track meta + like count + progress |
| Transport controls | 957, 898, 376 × 64 | Shuffle / back / play-pause / forward / volume |
| Queue / track list panel | 80, 502, 770 × 502 | Scrollable list of upcoming/related tracks |
| Bottom category pill bar | centered, ~100px tall | Discover / Playlists / Artists / Albums / Genres |

The canvas is designed at a fixed 1440-wide desktop breakpoint with everything absolutely positioned in Figma. Section 8 covers how this translates to a responsive, non-absolute React layout.

---

## 3. Color System

Base palette — dark, low-saturation, relies on translucency rather than many hues:

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#0F0F0F` | App background |
| `--color-surface-placeholder` | `#D9D9D9` | Image placeholder fill (before art loads) |
| `--color-text-primary` | `#FFFFFF` | Headlines, primary labels |
| `--color-text-secondary` | `rgba(255,255,255,0.8)` | Track titles in list rows |
| `--color-text-tertiary` | `rgba(255,255,255,0.6)` | Artist names, metadata |
| `--color-text-muted` | `rgba(255,255,255,0.7)` | Chip metadata (date · song count) |
| `--color-hairline` | `rgba(255,255,255,0.08)` | Row dividers |
| `--color-glass-fill-soft` | `rgba(0,0,0,0.004)` | Icon-button resting fill (near-invisible, exists only to establish a hit target/hover surface) |
| `--color-glass-fill` | `rgba(0,0,0,0.02) – 0.04` | Now-playing panel, floating card footer |
| `--color-glass-fill-active` | `rgba(0,0,0,0.2)` | Active nav pill / active category tab |
| `--color-sidebar-fill` | `rgba(255,255,255,0.08)` | Sidebar + bottom pill bar |
| `--color-border-subtle` | `rgba(255,255,255,0.1)` | Sidebar/pill-bar 1px border |
| `--color-border-card` | `rgba(255,255,255,0.2) – 0.4` | Floating card strokes |
| `--color-progress-track` | `rgba(255,255,255,0.2)` | Scrub bar unfilled |
| `--color-progress-fill` | `#FFFFFF` | Scrub bar filled |
| `--color-icon-on-light` | `rgba(0,0,0,0.9)` | Icons drawn on white circular buttons (play triangle) |
| `--color-icon-on-dark` | `#FFFFFF` | Icons on dark/glass surfaces |

**Gradients**

- Card image scrim: `linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.7) 100%)` — applied over every album image so white text stays legible at the bottom of the card.

**Blur recipe (glassmorphism)**

| Surface | `backdrop-filter: blur()` | Fill |
|---|---|---|
| Sidebar rail | 17px | `rgba(255,255,255,0.08)` |
| Bottom category pill bar | 27px | `rgba(255,255,255,0.08)` |
| Now-playing panel (under hero card) | 10px | `rgba(0,0,0,0.02–0.04)` |
| Floating card footer / badges | 10px | `rgba(0,0,0,0.02–0.04)` |
| Progress bar track | 5px | `rgba(255,255,255,0.2)` |

> ⚠️ Implementation note: `backdrop-filter` has partial browser support (no Firefox support pre-v103, no support in some in-app webviews). Provide a solid fallback fill via `@supports not (backdrop-filter: blur(1px))`.

---

## 4. Typography

Two families:

| Family | Role | Notes |
|---|---|---|
| **Urbanist** | UI body font — all labels, nav, metadata, controls | Weights used: 400, 500, 600 |
| **Zen Dots** | Wordmark + one hero "now playing" title moment | Decorative, uppercase, geometric — used sparingly |

### Type scale

| Style | Font | Weight | Size / Line-height | Case | Color | Used for |
|---|---|---|---|---|---|---|
| Wordmark | Zen Dots | 400 | 30 / 36 | UPPERCASE | `#FFFFFF` | "VYNL" logo, top-left |
| Hero track title | Urbanist | 600 | 36 / 43 | UPPERCASE | `#FFFFFF` | Large title on the floating-badge track panel (e.g. "FLOWERS") |
| Card overlay title | Urbanist | 600 | 22 / 26 | UPPERCASE | `#FFFFFF` | Title on floating release cards |
| Nav tab label | Urbanist | 600 | 18 / 22 | Sentence | `#FFFFFF` | Discover / Playlists / Artists / Albums / Genres |
| List row title | Urbanist | 500 | 20 / 28 | Sentence | `rgba(255,255,255,0.8)` | Track title in queue rows |
| List row artist | Urbanist | 500 | 12 / 14 | Sentence | `rgba(255,255,255,0.6)` | Artist · album in queue rows |
| Card footer artist | Urbanist | 500 | 14 / 17 | Sentence | `rgba(255,255,255,0.6)` | Artist on floating release card |
| Card footer meta | Urbanist | 400 | 12 / 14 | Sentence | `rgba(255,255,255,0.7)` | "Single · 2026 · 2 Songs" |
| Timecode | Urbanist | 500 | 16 / 19 | — | `#FFFFFF` | "3:30" duration in list rows |
| Progress timecode | Urbanist | 400 | 12 / 14 | — | `#FFFFFF` | Elapsed / remaining time |
| Badge label | Urbanist | 400 | 10 / 12 | Sentence | `#FFFFFF` | "New release" pill |
| Like count | Urbanist | 500 | 14 / 17 | — | `rgba(255,255,255,0.6)` | "12.8M likes" |

Font stacks (with system fallbacks):
```css
--font-display: 'Zen Dots', system-ui, sans-serif;
--font-body: 'Urbanist', -apple-system, 'Segoe UI', Roboto, sans-serif;
```

---

## 5. Spacing, Radius & Elevation

### Radius scale
| Token | Value | Used on |
|---|---|---|
| `--radius-sm` | 8px | Nav rail inactive link hit-area |
| `--radius-md` | 20–25px | "New release" badge, transport play/pause circle |
| `--radius-lg` | 32px | Floating release cards, queue panel, active nav circle |
| `--radius-xl` | 40–52px | Now-playing glass panel, hero-card footer, nav tab pills |
| `--radius-full` | 55–80px | Sidebar rail, bottom category bar, hero cover art |

### Spacing scale (base unit 4px)
`4, 8, 10, 12, 16, 17, 20, 24, 28, 32, 40, 80, 93, 133px` appear in the source — treat as an 8pt-ish system with two large "section gap" outliers (80px between transport icon groups, 93px sidebar link gap, 133–134px queue-row column gap) reserved specifically for those macro layouts.

### Elevation / shadow
- Floating release cards: `filter: drop-shadow(15px 4px 14px rgba(0,0,0,0.3))` — directional shadow reinforcing the "leaning card" rotation.
- All other surfaces are flat; depth is communicated via blur + opacity, not box-shadow.

---

## 6. Component Inventory

### 6.1 Sidebar Rail (primary nav)
- Fixed vertical pill, 100×512, centered vertically on the left edge.
- `rgba(255,255,255,0.08)` fill, 17px blur, 1px right border `rgba(17,17,17,0.1)`, fully rounded (60px).
- Vertical stack, `justify-content: space-between`, 5 items:
  1. **Home** (outline icon) — default state shows a 46×46 dark pill (`rgba(0,0,0,0.2)`) behind the icon to mark it **active**.
  2. **Search** (outline icon), 44×40 hit area, no active fill by default.
  3. **Music/Library** (outline icon).
  4. **Liked / Heart** (outline icon).
  5. **Profile avatar** — 46×46 circular image, pinned to the bottom, `order: 4`.
- Icons: 20×20, 1.5px stroke, white, all currently **outline style** (line icons), consistent stroke weight throughout the product.
- States: *active* = filled dark pill behind icon (see Home); *hover* = same treatment at reduced opacity; *default* = icon only, no fill.

### 6.2 Bottom Category Tab Bar
- Horizontal pill, ~726×100, same glass recipe as sidebar (8% white, 27px blur, 1px `rgba(255,255,255,0.1)` border, 80px radius).
- Contains 5 tabs at equal vertical padding (20px) / horizontal padding (32px): **Discover, Playlists, Artists, Albums, Genres**.
- Active tab (Discover): `rgba(0,0,0,0.2)` pill fill, 40px radius, white 18px/600 label.
- Inactive tabs: transparent fill, same label style, full opacity text (no dimming in source — consider dropping inactive label opacity to 0.6–0.7 in implementation for clearer state contrast).

### 6.3 Hero Player Card
- 550×860 rounded rectangle (62px radius), album artwork as background, `object-fit: cover`.
- Decorative ellipse cutout (155×178) top-center — appears to be a stylistic "peek" shape layered with the artwork (implement as an SVG mask or a second background layer, not a functional control).
- A glass panel (`Rectangle 41876`, 550×258, 52px radius, 10px blur, `rgba(0,0,0,0.02)`) is anchored to the **bottom** of the card, overlapping it, and hosts the "now playing" info: track title, artist, like count, progress bar.

### 6.4 Now-Playing Info Panel (inside hero card footer)
Left-aligned stack:
- Track title — 36px/600 Urbanist, uppercase (e.g. "FLOWERS").
- Artist — 14px/500, 60% white.
- Like button + "12.8M likes" — heart icon (14×14) + count, top-right of panel.
- Progress bar — 475px track, 6px stroke, rounded caps:
  - Unfilled: `rgba(255,255,255,0.2)`, 5px blur.
  - Filled: solid white, width proportional to playback position.
  - Elapsed time (left) and remaining/total time (right) as 12px labels flanking the bar.

### 6.5 Transport Controls
Horizontal group, 376×64, centered under the hero card, `gap: 80px` between clusters:
1. **Shuffle** — 24×24 outline icon, standalone.
2. **Back / Forward group** (`gap: 28px`): skip-backward, then a centered **play/pause** button (64×64, solid white circle, 32px radius, black glyph — 12.5%/55.6% inset "pause" bars by default, swap to a right-pointing triangle for the play state), then skip-forward.
3. **Volume/sound** — 24×24 outline icon with a 5-bar equalizer/wave glyph, standalone.

All icon buttons ≥24×24 target; wrap in a ≥44×44 tappable/clickable area for accessibility even where the visual glyph is smaller.

### 6.6 Floating "New Release" Card Stack
Three overlapping cards, each 250×338, staggered with independent rotation (0°, +4.31°, −10.5°) and z-order, simulating a fanned stack of vinyl sleeves near the top of the canvas:
- Rounded rect (32px), 1px border (`rgba(255,255,255,0.2–0.4)`), image background + bottom scrim gradient.
- Decorative circular cutout (62×62) near the top, matching the hero card's ellipse motif.
- "New release" pill badge (74×32, 20px radius, low-opacity fill) top-left of each card.
- Heart / like icon button (50×50 circle, near-invisible fill) top-right.
- Footer glass panel (250×127, 32px radius, blur 10) at the card base with: title (22px/600 uppercase), artist (14px/500), and a metadata row ("Single · 2026 · 2 Songs") separated by 4×4 dot glyphs.
- Play button (50×50, solid white circle) anchored at the bottom-right corner of the card footer, overlapping the card edge.
- This stack is decorative/browsable — clicking a card should promote it to the hero player position (see §9, interaction notes).

### 6.7 Queue / Track List Panel
- Container: 770×502 (extends visually to ~594 with header), 52px radius, near-transparent fill (`rgba(0,0,0,0.004)`).
- **Row anatomy** (each row 754×84, repeated 5–6×):
  - Left accent bar: 4×46, 11px radius on the right side only — intended as a **queue-position / now-playing indicator** (should be colored/highlighted for the currently playing row, transparent for others).
  - 60×60 circular thumbnail.
  - Title (20px/500, 80% white) + artist/album line (12px/500, 60–80% white), stacked with 2px gap.
  - Right-aligned cluster: duration ("3:30", 16px/500 white), like icon button (60×60 hit area, 55px radius), overflow/"more" button (three dots, 60×60 hit area).
  - 1px hairline divider (`rgba(255,255,255,0.08)`) beneath each row except the last.
- Sample queue content from the mockup (use as placeholder/seed data):
  1. Flowers — Miley Cyrus — 3:30
  2. Manchild — Sabrina Carpenter — 3:30
  3. Sports Car — Tate McRae, *So Close To What* — 3:30
  4. Die With A Smile — Lady Gaga & Bruno Mars — 3:30
  5. Lunch — Billie Eilish, *HIT ME HARD AND SOFT* — 3:30
  6. Birds of a Feather — Billie Eilish, *HIT ME HARD AND SOFT* — 3:30

---

## 7. Iconography

Custom line-icon set, consistent 1.5px stroke, 20–24px bounding box, white on dark surfaces / near-black (`rgba(0,0,0,0.9)`) on white surfaces:

`home, search, music-note, heart (outline + filled "like" states), shuffle, skip-back, skip-forward, pause, play (triangle), volume/sound (5-bar wave), overflow-menu (3 dots), avatar`

Recommend sourcing/rebuilding this set as a single SVG sprite or icon-component library (e.g. `lucide-react` as a close stylistic match, or a custom Figma icon export) rather than an icon font, to preserve crisp 1.5px strokes at all sizes.

---

## 8. Responsive Behavior (beyond the fixed 1440 mockup)

The mockup is a single fixed desktop composition with absolute positioning. For production this must become a fluid layout:

| Breakpoint | Sidebar | Hero card | Queue panel | Tab bar |
|---|---|---|---|---|
| ≥1280px (design target) | Full vertical rail, left | Full height, right column | Left column, scrollable | Floating pill, bottom-center |
| 1024–1279px | Rail collapses to icon-only, narrower | Scales down proportionally, keeps aspect ratio | Shrinks column width, row padding reduced | Pill scales, may wrap to icon+label smaller |
| 768–1023px (tablet) | Rail becomes a bottom tab bar or slide-out drawer | Becomes a top "now playing" strip (horizontal card) | Full-width list below player | Merge into a single bottom nav |
| <768px (mobile) | Bottom tab bar (5 icons) | Compact mini-player (sticky bottom, expandable to full-screen sheet) | Full-width scrollable list, single column | Replaced by mobile tab bar; category filters become a horizontal scroll chip row |

General rules:
- Preserve the **rounded, glass, floating-panel language** at every breakpoint — don't flatten to square edges on mobile.
- The floating "new release" card stack is a nice-to-have on desktop; on mobile, replace with a standard horizontal-scroll carousel (rotation/overlap effect is not appropriate for touch scroll performance/readability).
- Progress bar, transport controls, and now-playing metadata should always stay visible/reachable (sticky mini-player pattern) when the user navigates away from the hero view.

---

## 9. Interaction & State Notes

- **Active navigation state** = dark pill fill behind the icon (sidebar) or `rgba(0,0,0,0.2)` pill (tab bar) — reuse the same "active pill" token across both.
- **Hover** (desktop): raise icon-button fill from `rgba(0,0,0,0.004)` → `rgba(255,255,255,0.08)`; underlying blur unaffected.
- **Like/heart toggle**: outline heart (default) → filled heart + brief scale pop (120ms ease-out) on like; like count increments optimistically.
- **Play/pause button**: glyph swaps between pause bars and play triangle; button itself does not change size/color.
- **Selecting a track in the queue**: promotes that track's artwork into the hero card, updates the now-playing panel and progress bar, and the row's left accent bar becomes highlighted (colored, not transparent) to mark "currently playing."
- **Selecting a floating release card**: same promotion behavior as above, since it represents "play this now."
- **Progress bar**: draggable scrubber; dragging updates the elapsed-time label live; releasing seeks playback.
- **Loading state**: use the `#D9D9D9` placeholder fill (or a skeleton shimmer over it) for any artwork slot before the image has loaded — this is literally encoded as the fallback background color in the source file.

---

## 10. Accessibility Notes

- Text on glass surfaces relies on the background-image scrim (`linear-gradient` dark fade) to hit contrast — enforce a **minimum overlay darkness** at render time so title text (`#FFFFFF` on unpredictable album art) always meets WCAG AA (4.5:1 for body text, 3:1 for the large 36px title).
- Icon-only buttons (heart, shuffle, overflow, transport controls) need `aria-label`s ("Like", "Shuffle", "More options", "Play", "Pause", "Skip forward", "Skip back", "Mute/volume").
- Ensure the 44×44px minimum touch target on all icon buttons, even where the visual glyph or drawn hit-area in the mockup is smaller (several source hit-areas are 24×24 — pad these in implementation).
- Respect `prefers-reduced-motion`: disable the card-stack rotation/hover-lift and heart "pop" animation, replace with instant state changes.
- Support keyboard control of the transport bar (Space = play/pause, arrow keys = seek/skip) and the progress scrubber (arrow keys = ±5s).

---

## 11. Asset & Content Checklist

- [ ] Album/track artwork (min. 550×860 for hero slot, min. 250×338 for release cards, min. 60×60 for list thumbnails) — all need real, licensed art; mockup uses `#D9D9D9` gray placeholders.
- [ ] Profile avatar image.
- [ ] Urbanist (weights 400/500/600) and Zen Dots web fonts, self-hosted or via Google Fonts, with `font-display: swap`.
- [ ] Icon set (see §7) as SVG components.
- [ ] Seed/mock track data matching the schema in §12 of `FrontendArchitecture.md`.
