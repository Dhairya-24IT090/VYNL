# UI/UX Design — VYNL

## 1. Design Philosophy
VYNL's interface is "Music-First". It prioritizes high-fidelity visuals, interactive feedback, and seamless transitions between listening and social interaction.

## 2. Core Design Tokens
- **Primary Palette:** Deep Onyx (#0A0A0A), Electric Violet (#8B5CF6), Slate Gray (#1F2937).
- **Typography:** Sans-serif (Inter/Roboto) for readability; Monospace for technical details (like recommendation explanations).
- **Interactions:** Use micro-animations for play/pause, like actions, and real-time cursor indicators in collaborative playlists.

## 3. Key User Flows

### 3.1 The Discovery Flow
1. **Home Screen:** Displays "Because you liked [Artist]", "Trending in [Genre]".
2. **Track Interaction:** Long-press or click "Why?" to see the explanation tooltip (e.g., "95% similarity to your lo-fi favorites").
3. **Seed Action:** Click "Generate similar" to instantly create a temporary session based on the current track.

### 3.2 The Collaborative Flow
1. **Invite:** User A shares a playlist link.
2. **Join:** User B clicks the link and appears in the "Live Presence" bar.
3. **Edit:** User B drags a track; User A sees the track move in real-time with a "User B is moving this" label.

### 3.3 The Social Hub Flow
1. **Genre Channel:** User enters the "Synthwave" channel.
2. **Now Playing:** A globally synced "Now Playing" track is visible at the top.
3. **Threaded Chat:** Users reply to specific tracks or messages without cluttering the main channel.

## 4. Main Screen Layouts

### 4.1 Player (Web/Mobile)
- **Top:** Track/Artist info with "Explanation" toggle.
- **Center:** Album Art / Custom Lyric Template overlay.
- **Bottom:** Transport controls + Queue access.
- **Floating:** "Social Sidebar" toggle for threaded comments.

### 4.2 Community Dashboard
- **Grid View:** Genre-based "Rooms".
- **Activity Feed:** Real-time updates on what friends are listening to / collaborating on.

### 4.3 Collaborative Editor
- **List View:** Tracks with "Added By" avatars.
- **Sync Status:** Real-time indicator of offline/online collaborators.
