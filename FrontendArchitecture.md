# VYNL — FrontendArchitecture.md

**Scope:** Frontend/UI layer only (no backend, auth, or streaming-infrastructure design). Companion document to `Design.md`.
**Tech stack:** React (18+), functional components + hooks.

---

## 1. Goals & Constraints

- Faithfully reproduce a glassmorphic, artwork-first music-player UI (see `Design.md`) as a maintainable, componentized React app.
- Must support: browsing releases, viewing/scrubbing a "now playing" hero player, managing a queue/track list, liking tracks, switching category tabs, responsive collapse down to mobile.
- No backend is assumed to exist yet — architecture must work fully against local/mock data and be swappable for a real API/audio-streaming layer later without a rewrite.
- Audio playback is a first-class concern even though this is "UI only": the player controls in the mockup are functional controls, so real `<audio>` element wiring (or a documented stub) is required, not just static markup.

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| UI library | React 18 (Vite) | Fast dev server, native ESM, no framework lock-in for a UI-only scope |
| Language | TypeScript | Track/queue/player data models benefit heavily from static typing; catches prop-shape drift between the many card/row components |
| Styling | CSS Modules + a small design-token layer (CSS custom properties) | The design is token-driven (radius scale, opacity scale, blur recipe) — plain CSS vars map 1:1 to `Design.md` tables without pulling in a heavier CSS-in-JS runtime. Tailwind is a valid alternative if the team prefers utility classes; either choice must consume the same token file. |
| State management | React Context + `useReducer` for player/queue state; local `useState` for isolated UI state (tab selection, hover) | Player state (current track, position, playing/paused, queue order) is genuinely global and needs predictable transitions — a reducer keeps that logic testable and out of components. No need for Redux/Zustand at this scope; revisit if the app grows multi-page. |
| Routing | React Router v6 | Discover / Playlists / Artists / Albums / Genres are route-like destinations even if visually rendered as tabs |
| Animation | Framer Motion | Card stack rotation/hover-lift, like-button pop, mini-player expand/collapse — declarative and respects `prefers-reduced-motion` easily |
| Icons | Custom SVG icon components (see `Design.md` §7) exported from a single `icons/` module; `lucide-react` as a fallback source for any glyph not worth hand-tracing | Keeps 1.5px stroke consistency |
| Audio | native `<audio>` element wrapped in a `usePlayer` hook (Web Audio API only if visualizer/EQ features are added later) | No dependency needed for basic playback; keeps the door open for gapless/streaming later |
| Testing | Vitest + React Testing Library; Playwright for critical-path e2e (play/pause, queue reorder, seek) | Matches Vite tooling |
| Linting/formatting | ESLint (typescript-eslint) + Prettier + `stylelint` for CSS Modules | |
| Build | Vite | Fast HMR needed given the volume of visual/CSS iteration this design implies |

---

## 3. Project Structure

```
vynl/
├── public/
│   └── fonts/                     # self-hosted Urbanist + Zen Dots (woff2)
├── src/
│   ├── app/
│   │   ├── App.tsx                # Router + top-level providers
│   │   ├── routes.tsx             # Route table (Discover/Playlists/Artists/Albums/Genres)
│   │   └── providers/
│   │       ├── PlayerProvider.tsx # Context + reducer (see §5)
│   │       └── ThemeProvider.tsx  # injects design tokens, handles prefers-reduced-motion
│   │
│   ├── design-system/
│   │   ├── tokens.css             # colors, radii, spacing, blur recipe (source of truth from Design.md)
│   │   ├── typography.css         # Urbanist / Zen Dots scale
│   │   └── primitives/
│   │       ├── GlassPanel.tsx     # reusable blurred-surface wrapper (fill, blur, radius, border as props)
│   │       ├── Pill.tsx           # rounded pill container (used by sidebar, tab bar, badges)
│   │       ├── IconButton.tsx     # 44x44 min hit-area wrapper around an SVG icon
│   │       └── Avatar.tsx
│   │
│   ├── icons/
│   │   ├── index.ts                # barrel export
│   │   ├── HomeIcon.tsx, SearchIcon.tsx, MusicIcon.tsx, HeartIcon.tsx,
│   │   │   ShuffleIcon.tsx, SkipBackIcon.tsx, SkipForwardIcon.tsx,
│   │   │   PlayIcon.tsx, PauseIcon.tsx, VolumeIcon.tsx, MoreIcon.tsx
│   │
│   ├── features/
│   │   ├── navigation/
│   │   │   ├── SidebarNav.tsx          # §6.1 in Design.md
│   │   │   └── CategoryTabBar.tsx      # §6.2 — Discover/Playlists/Artists/Albums/Genres
│   │   │
│   │   ├── player/
│   │   │   ├── HeroPlayerCard.tsx      # §6.3 — big artwork + footer panel composition
│   │   │   ├── NowPlayingPanel.tsx     # §6.4 — title/artist/likes/progress
│   │   │   ├── TransportControls.tsx   # §6.5 — shuffle/back/play-pause/forward/volume
│   │   │   ├── ProgressBar.tsx         # draggable scrubber, controlled by usePlayer()
│   │   │   ├── MiniPlayer.tsx          # collapsed/mobile sticky variant
│   │   │   └── usePlayer.ts            # hook wrapping PlayerContext + <audio> ref
│   │   │
│   │   ├── releases/
│   │   │   ├── ReleaseCardStack.tsx    # §6.6 — 3-card fanned/rotated stack
│   │   │   ├── ReleaseCard.tsx         # single card, `rotation` + `zIndex` props
│   │   │   └── ReleaseCarouselMobile.tsx # horizontal-scroll fallback (no rotation) — see Design.md §8
│   │   │
│   │   └── queue/
│   │       ├── QueuePanel.tsx          # §6.7 container
│   │       ├── QueueRow.tsx            # single track row
│   │       └── useQueue.ts             # selection, like-toggle, reorder helpers
│   │
│   ├── data/
│   │   ├── types.ts                    # Track, Release, QueueItem, PlayerState (see §5.1)
│   │   ├── mockTracks.ts               # seed data mirroring the mockup's 6 sample tracks
│   │   └── api/                        # thin fetch wrappers — swappable for real endpoints later
│   │       └── tracksApi.ts            # `getQueue()`, `getReleases()`, `toggleLike(id)` — mocked now
│   │
│   ├── hooks/
│   │   ├── useMediaQuery.ts
│   │   ├── usePrefersReducedMotion.ts
│   │   └── useAudioElement.ts          # low-level <audio> event wiring used by usePlayer
│   │
│   ├── layouts/
│   │   ├── DesktopLayout.tsx           # composes sidebar + hero + queue (§8 ≥1280px)
│   │   └── MobileLayout.tsx            # bottom tab bar + mini-player + full-width queue
│   │
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Component Architecture Principles

1. **Primitives own the glass/pill visual language; features own behavior.** `GlassPanel`, `Pill`, and `IconButton` in `design-system/primitives` are the *only* places `backdrop-filter`, radius tokens, and hit-area padding are hard-coded. Every feature component (sidebar, tab bar, hero card footer, release card footer, badges) composes these primitives instead of re-declaring blur/radius CSS — this is what keeps 6 visually similar "glass surfaces" from drifting out of sync when the design changes.
2. **Presentational vs. container split inside `features/`.** E.g. `QueueRow` is purely presentational (`track`, `isActive`, `onSelect`, `onToggleLike` props); `QueuePanel` is the container that pulls data from `useQueue()`/context and maps it to rows. This keeps rows trivially testable and Storybook-able with static props.
3. **One hook per cross-cutting concern.** `usePlayer()` is the single API surface for anything that needs "what's playing / seek / play / pause / next / previous / volume" — `TransportControls`, `ProgressBar`, `MiniPlayer`, and `QueueRow` (for its active-row highlight) all consume the same hook rather than prop-drilling player state through the tree.
4. **No component reaches into another feature's internals.** `releases/ReleaseCard` "selecting" a card promotes it to the hero player by calling `usePlayer().playTrack(track)` — it never imports from `features/player` beyond that hook.
5. **Icons are components, not strings/classnames.** Every icon is a typed React component (`<PlayIcon size={24} />`) so stroke-width and color are enforced via TS props rather than ad hoc CSS overrides.

---

## 5. State Management

### 5.1 Core data model (`data/types.ts`)

```ts
export interface Track {
  id: string;
  title: string;
  artist: string;
  albumOrContext?: string;   // e.g. "So Close To What" — shown as secondary line
  artworkUrl: string;
  durationSec: number;
  likeCount: number;
  isLiked: boolean;
}

export interface Release extends Track {
  releaseType: 'Single' | 'Album' | 'EP';
  year: number;
  trackCount: number;
  isNew: boolean;             // drives the "New release" badge
}

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  positionSec: number;
  volume: number;             // 0–1
  isShuffled: boolean;
}

export type PlayerAction =
  | { type: 'PLAY_TRACK'; track: Track; queue?: Track[] }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SEEK'; positionSec: number }
  | { type: 'NEXT' }
  | { type: 'PREVIOUS' }
  | { type: 'TOGGLE_SHUFFLE' }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'TICK'; positionSec: number };   // driven by the <audio> timeupdate event
```

### 5.2 `PlayerProvider` (Context + reducer)

- Holds `PlayerState`, dispatches the actions above through a pure reducer (`playerReducer.ts`), and owns the single `<audio>` element via `useAudioElement`.
- Side effects (actually calling `audio.play()`/`audio.pause()`/setting `audio.src`) live in a `useEffect` inside the provider that reacts to `currentTrack`/`isPlaying` changes — the reducer itself stays a pure function for testability.
- Exposes `usePlayer()` returning both state and bound action creators (`playTrack`, `togglePlay`, `seek`, `next`, `previous`, `toggleShuffle`, `setVolume`).

### 5.3 `useQueue`
- Wraps `usePlayer()`'s `queue`/`queueIndex` plus like-toggle mutation (optimistic update against `data/api/tracksApi.ts`).
- Owns nothing that duplicates player state — it's a thin selector/action layer, not a second source of truth.

### 5.4 Local UI state (not lifted to context)
- Active category tab (`CategoryTabBar`) — `useState` + URL sync via React Router, since it's also a navigable route.
- Hover/focus states — component-local `useState` or CSS `:hover`/`:focus-visible` where no JS is actually needed.
- Card-stack rotation/lift — Framer Motion `whileHover` variants local to `ReleaseCard`.

---

## 6. Styling Architecture

- **Token source of truth:** `design-system/tokens.css` defines every value cataloged in `Design.md` §3–5 as CSS custom properties (`--color-bg`, `--radius-lg`, `--blur-sidebar`, etc.). No component should hard-code a hex value, opacity, radius, or blur — always reference a token, so future design updates are a one-file change.
- **CSS Modules per component** (`ComponentName.module.css`) colocated with the component, composing tokens.
- **Glassmorphism helper:**
  ```css
  /* design-system/primitives/GlassPanel.module.css */
  .glass {
    background: var(--glass-fill, rgba(255,255,255,0.08));
    backdrop-filter: blur(var(--glass-blur, 17px));
    -webkit-backdrop-filter: blur(var(--glass-blur, 17px));
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-full);
  }
  @supports not (backdrop-filter: blur(1px)) {
    .glass { background: rgba(20, 20, 20, 0.85); } /* solid fallback, no blur */
  }
  ```
- **Responsive strategy:** container queries where a component (e.g. `HeroPlayerCard`) needs to reflow based on its own allocated space rather than viewport width; standard media queries at the breakpoints defined in `Design.md` §8 for the top-level layout switch (`DesktopLayout` vs `MobileLayout`).
- **Reduced motion:** a single `[data-reduced-motion="true"]` attribute set on `<html>` by `usePrefersReducedMotion`, referenced in CSS (`:where([data-reduced-motion="true"]) .cardHover { transform: none; transition: none; }`) and passed into Framer Motion's `MotionConfig reducedMotion="user"`.

---

## 7. Audio Playback Integration

- `useAudioElement(src, { onTimeUpdate, onEnded })` owns a single hidden `<audio>` node (rendered once at the `PlayerProvider` root, never remounted per-track) and wires:
  - `timeupdate` → dispatches `TICK` (throttled to ~4×/sec to avoid re-render storms in `ProgressBar`).
  - `ended` → dispatches `NEXT`.
  - `loadedmetadata` → reconciles reported duration with `track.durationSec` if they diverge.
- `ProgressBar` is a **controlled** component: while the user is dragging, local drag-state overrides the displayed position; on release it dispatches `SEEK` and sets `audio.currentTime` directly (avoids fighting `timeupdate` during a drag).
- Volume/mute icon in `TransportControls` maps to `audio.volume`; no dedicated volume slider is present in the mockup, so scope this to a click-to-mute toggle unless product asks for a slider later.
- This hook is intentionally decoupled from *where the audio file comes from* — swapping local `mock/*.mp3` for a real streaming CDN URL later is a one-line change in `data/api/tracksApi.ts`.

---

## 8. Data Flow Summary

```
tracksApi.ts (mock now, real fetch later)
        │
        ▼
 PlayerProvider (Context + reducer)  ───────────► <audio> element (side effect)
        │        ▲
        │        │ TICK (timeupdate)
        ▼        │
   usePlayer() ───┘
     │     │     │
     ▼     ▼     ▼
HeroPlayerCard  TransportControls  ProgressBar
     │
     ▼
NowPlayingPanel

QueuePanel ── useQueue() ── usePlayer() (reads currentTrack/queueIndex for "active row" highlight)
ReleaseCardStack ── onSelect → usePlayer().playTrack(track, releases)
```

One-directional: UI dispatches actions → reducer updates state → provider syncs `<audio>` → DOM events flow back in as `TICK`/`ENDED` actions. No component mutates player state directly.

---

## 9. Accessibility & Performance Implementation Notes

(Extends `Design.md` §10.)

- **Focus management:** `IconButton` primitive forwards `ref` and applies a visible `:focus-visible` ring (token `--color-focus-ring`, not present in the visual mockup but required for keyboard users — glass surfaces have low default contrast).
- **Live region:** a visually-hidden `aria-live="polite"` region announces track changes ("Now playing: Flowers by Miley Cyrus") for screen-reader users, since the change is otherwise a silent visual swap in the hero card.
- **Image loading:** all artwork uses `loading="lazy"` except the current hero track (`loading="eager"` + `fetchpriority="high"`), with the `#D9D9D9` placeholder as a CSS background shown until `onLoad` fires (or via a blur-up low-res placeholder if the API provides one).
- **Virtualization:** `QueuePanel` list is small in the mockup (6 rows) but should use a windowed list (e.g. `react-virtual`) once real playlists/queues can run into the hundreds, to keep the glass-panel scroll smooth.
- **Animation cost:** `ReleaseCardStack`'s rotated/shadowed cards are the most expensive visual — use `transform`/`opacity`-only Framer Motion variants (GPU-accelerated), avoid animating `filter`/`backdrop-filter` directly (expensive to composite), and prefer `will-change: transform` scoped only to the hovered card.

---

## 10. Build, Quality & Delivery

- **Environments:** `.env` driven base API URL (`VITE_API_BASE_URL`) so `data/api/tracksApi.ts` can point at mocks (MSW — Mock Service Worker — recommended for local dev/tests) vs. a real backend without code changes.
- **Component development:** Storybook for every component under `design-system/primitives` and `features/*` presentational components, using the mock track/release fixtures from `data/mockTracks.ts` — this doubles as living documentation of the `Design.md` component inventory.
- **CI gates:** typecheck → lint (ESLint + stylelint) → unit tests (Vitest) → Playwright smoke test (load app → play track → verify progress advances → pause) → build.
- **Design-token drift check:** a lightweight test asserts `tokens.css` values match a checked-in snapshot derived from `Design.md`, so visual-spec changes require an explicit, reviewed update to both files together.

---

## 11. Open Questions for Product/Design Handoff

1. Is the floating "New release" card stack purely decorative/browsable, or does it need its own dedicated route (e.g. "New Releases")?
2. Confirm inactive-tab text treatment in `CategoryTabBar` — mockup exports full-opacity white for all tabs; recommend dimming inactive labels for clearer state contrast (see `Design.md` §6.2).
3. Is a volume **slider** required, or is click-to-mute sufficient (mockup shows only a static wave icon, no slider track)?
4. Should the left accent bar on queue rows (`Rectangle 40198`) carry a specific color per track/mood, or should it simply toggle white/transparent for active vs. inactive?
5. Mobile navigation pattern preference: bottom tab bar vs. slide-out drawer for the sidebar equivalent (both are viable given the pill-shaped rail's affordances).
