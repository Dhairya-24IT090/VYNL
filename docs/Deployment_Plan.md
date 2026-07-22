# Deployment Plan — VYNL

## 1. Target Infrastructure
- **Provider:** Oracle Cloud "Always Free" Tier.
- **Specs:** 4 OCPU (ARM Ampere), 24 GB RAM, 200 GB Block Storage.
- **OS:** Ubuntu 22.04 LTS.

## 2. Orchestration & Environment
- **Container Engine:** Docker.
- **Orchestrator:** Docker Compose.
- **API Gateway:** Traefik (Docker provider).
- **External Services:**
    - **Neon.tech:** Serverless PostgreSQL (Main DB).
    - **MongoDB Atlas:** Managed Document Store (Chat).
    - **Telegram:** Object storage for audio files.
    - **Cloudflare:** DNS, SSL, and Edge Caching.

## 3. CI/CD Pipeline (GitHub Actions)

### 3.1 Validation Stage
- **Triggers:** PR to `main` branch.
- **Actions:** Linting (`ruff`), Type-checking (`mypy`), Unit tests (`pytest`).

### 3.2 Build Stage
- **Triggers:** Merge to `main`.
- **Actions:** 
    - Build Docker images for each service.
    - Push images to GitHub Container Registry (GHCR) with `:latest` and `:<commit_sha>` tags.

### 3.3 Deploy Stage
- **Triggers:** Successful Build.
- **Actions:**
    - SSH into the Oracle VM.
    - Copy updated `docker-compose.yml` and `.env` (via GitHub Secrets).
    - Run `docker compose pull && docker compose up -d --remove-orphans`.

## 4. Monitoring & Observability
- **Self-hosted Stack:**
    - **Prometheus:** Metrics collection.
    - **Grafana:** Visualization and Alerting.
    - **Loki:** Centralized logging.
- **Health Checks:** Traefik dashboard and Docker health checks per service.

## 5. Security & Maintenance
- **Backups:** Daily snapshots of the Oracle VM; automated exports of PostgreSQL (Neon) and MongoDB (Atlas).
- **Updates:** Automated package updates (`unattended-upgrades`) on the host VM.
- **Secrets:** All secrets stored in GitHub Actions Secrets and injected as environment variables during deployment.
