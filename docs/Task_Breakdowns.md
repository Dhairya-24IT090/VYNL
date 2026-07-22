# Task Breakdowns — VYNL

## 1. Project Phases & Milestones

### Milestone 1: Core Infra & Auth (Weeks 1-2)
- Setup Oracle Cloud VM & Docker Compose environment.
- Implement Auth Service (FastAPI + PostgreSQL + JWT).
- Setup API Gateway (Traefik).
- **Owners:** Maharsh (Infra), Dhairya (Auth).

### Milestone 2: Catalog & Streaming (Weeks 3-4)
- Implement Catalog Service (PostgreSQL + Metadata).
- Implement Streaming Service (Pyrogram + Telegram Storage Proxy).
- Basic Web Player (Next.js) with playback controls.
- **Owners:** Maharsh (Streaming), Dhairya (Catalog/Web).

### Milestone 3: Recommendation Engine (Weeks 5-6)
- Setup Redis Streams for event logging.
- Implement Recommendation Service (FAISS + Vector Search).
- Training pipeline for initial track embeddings.
- **Owners:** Milan (ML), Dhairya (Integration).

### Milestone 4: Collaborative & Social (Weeks 7-8)
- Implement Playlist Service (WebSockets + Ypy CRDT).
- Implement Discussion Hub (WebSockets + MongoDB).
- Real-time UI updates for Web/Mobile.
- **Owners:** Dhairya (Full-stack), Milan (Social logic).

### Milestone 5: Polishing & Deployment (Weeks 9-10)
- Analytics & History Service implementation.
- Lyrics Service with custom template support.
- CI/CD pipeline automation via GitHub Actions.
- **Owners:** All.

## 2. Team Responsibilities

| Team Member | Primary Domain | Secondary Domain |
|---|---|---|
| **Dhairya Shah** | Full-stack / App / Catalog | Auth / UX |
| **Maharsh Solanki**| Backend / Infra / Streaming | Security / DevOps |
| **Milan Vadhel** | ML / Recommendations | Discussion Hub / Analytics |

## 3. Sprint Cadence
- **Weekly Sync:** Progress review and roadblock resolution (Monday).
- **Demo Day:** Showcasing working features (Friday).
- **Retrospective:** Planning the next week (Friday).
