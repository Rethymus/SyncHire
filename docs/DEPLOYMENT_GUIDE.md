# SyncHire Deployment Guide

SyncHire is intentionally **lightweight**: it ships as Docker containers and a
Docker Compose stack. There is **no Kubernetes** involved — no clusters, no
manifests, no Helm charts. This guide covers local development, single-host
Docker deployment, migrations, monitoring basics, and backups.

## Table of Contents

- [Deployment Overview](#deployment-overview)
- [Local Development Setup](#local-development-setup)
- [Docker Deployment](#docker-deployment)
- [Database Migration](#database-migration)
- [Monitoring & Logging](#monitoring--logging)
- [Security Hardening](#security-hardening)
- [Backup & Disaster Recovery](#backup--disaster-recovery)
- [Troubleshooting](#troubleshooting)

## Deployment Overview

### Architecture Components

- **Frontend** — Next.js 16 app (static-optimized).
- **Backend** — FastAPI service.
- **MCP servers** — Modular AI services (jd-parser, resume-analyzer, etc.).
- **Datastores** — PostgreSQL + PGVector, Redis, Minio (S3-compatible).

### Deployment Options

| Target | Method |
|--------|--------|
| Local dev | `docker-compose.yml` (root) |
| Single-host prod | `deploy/docker/docker-compose.prod.yml` |

## Local Development Setup

### Prerequisites

- Docker 24+ and Docker Compose v2
- Node.js 22 (frontend dev) and Python 3.11+ (backend dev)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/Rethymus/synchire.git
cd synchire

# Copy environment template
cp .env.example .env
# Edit .env — set API keys, database credentials, etc.

# Install dependencies (frontend)
cd frontend && npm install && cd ..

# Start infrastructure (Postgres, Redis, Minio)
docker compose up -d postgres redis minio

# Run database migrations
cd api && alembic upgrade head && cd ..

# Start development servers
cd frontend && npm run dev        # in one terminal
cd api && uvicorn main:app --reload   # in another
```

### Access Local Services

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs
- Minio console: http://localhost:9001

## Docker Deployment

### Docker Compose Setup

The root `docker-compose.yml` brings up the supporting infrastructure
(Postgres, Redis, Minio). Use it for local development:

```bash
docker compose up -d
```

### Production Docker Compose

`deploy/docker/docker-compose.prod.yml` defines the full stack for a
single host: frontend, backend, MCP servers, Postgres, Redis, Minio, and Nginx.

Images are built from:

- `deploy/docker/frontend.Dockerfile`
- `deploy/docker/backend.Dockerfile`
- `deploy/docker/mcp-server.Dockerfile`

### Deploy with Docker Compose

```bash
# Build production images (helper script)
./deploy/scripts/build.sh

# Start production services
docker compose -f deploy/docker/docker-compose.prod.yml up -d

# View logs
docker compose -f deploy/docker/docker-compose.prod.yml logs -f

# Stop services
docker compose -f deploy/docker/docker-compose.prod.yml down
```

Environment configuration is supplied via a `.env` file loaded by the compose
stack. Never bake secrets into images.

## Database Migration

### Alembic Migration

```bash
cd api

# Create a migration
alembic revision --autogenerate -m "describe change"

# Run migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

### Production Migration

Run migrations against the running database container:

```bash
# Back up before migrating (see Backup section)
docker compose -f deploy/docker/docker-compose.prod.yml exec postgres \
  pg_dump -U synchire synchire > backup-$(date +%F).sql

# Run migration
docker compose -f deploy/docker/docker-compose.prod.yml exec api \
  alembic upgrade head
```

## Monitoring & Logging

### Health Checks

Each container defines a health check. Inspect status:

```bash
docker compose -f deploy/docker/docker-compose.prod.yml ps
```

Service-level health endpoints:

- Frontend: `GET /` (200 OK)
- Backend: `GET /health`
- MCP servers: `GET /health`

### Logging Configuration

Containers log to stdout/stderr (12-factor). Configure log rotation via the
Docker logging driver:

```yaml
# docker-compose.prod.yml (service-level)
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "5"
```

## Security Hardening

### SSL/TLS Configuration

Terminate TLS at Nginx (`deploy/docker/nginx.conf`). Provide certificates via
mounted volumes or an ACME sidecar (e.g. Caddy/Traefik) — never inside the image.

### Security Headers

Nginx sets HSTS, X-Content-Type-Options, frame-ancestors, and a restrictive
CSP. Adjust in `deploy/docker/nginx.conf`.

### Firewall Configuration

On the host, expose only 80/443; keep Postgres/Redis/Minio on the internal
Docker network only:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Backup & Disaster Recovery

### Database Backup

```bash
# Create a backup
docker compose -f deploy/docker/docker-compose.prod.yml exec postgres \
  pg_dump -U synchire synchire | gzip > backup-$(date +%F).sql.gz

# Restore
gunzip -c backup-YYYY-MM-DD.sql.gz | \
  docker compose -f deploy/docker/docker-compose.prod.yml exec -T postgres \
  psql -U synchire synchire
```

Automate with a cron job on the host; rotate local copies (e.g. keep 7 days).

### File Storage Backup

Back up Minio data by snapshotting its volume:

```bash
docker compose -f deploy/docker/docker-compose.prod.yml stop minio
tar czf minio-data-$(date +%F).tar.gz <minio-volume-path>
docker compose -f deploy/docker/docker-compose.prod.yml start minio
```

### Disaster Recovery Plan

1. Provision a fresh host with Docker.
2. Restore `.env` (from your secret store).
3. `docker compose -f deploy/docker/docker-compose.prod.yml up -d`.
4. Restore the latest DB dump.
5. Restore Minio volume.
6. Verify health endpoints.

## Troubleshooting

### Common Issues

**Container won't start / crashes:**

```bash
docker compose -f deploy/docker/docker-compose.prod.yml logs <service>
docker compose -f deploy/docker/docker-compose.prod.yml ps
docker compose -f deploy/docker/docker-compose.prod.yml restart <service>
```

**Database connection failures:**

```bash
docker compose -f deploy/docker/docker-compose.prod.yml exec postgres pg_isready
docker compose -f deploy/docker/docker-compose.prod.yml logs postgres
```

**Out of memory / slow:**

```bash
docker stats
# Tune memory limits in docker-compose.prod.yml service definitions
```

### Debug Commands

```bash
# List running services
docker compose -f deploy/docker/docker-compose.prod.yml ps

# Shell into a container
docker compose -f deploy/docker/docker-compose.prod.yml exec api sh

# Follow logs
docker compose -f deploy/docker/docker-compose.prod.yml logs -f api
```

### Performance Issues

```bash
# Active queries
docker compose -f deploy/docker/docker-compose.prod.yml exec postgres \
  psql -U synchire -c "SELECT * FROM pg_stat_activity WHERE state='active';"

# CPU/memory per container
docker stats --no-stream
```
