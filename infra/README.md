# Streamora — infrastructure blueprint

This folder documents **how Streamora maps to GCP** and how environments are organized. It complements the root [`docker-compose.yml`](../docker-compose.yml), which runs **local-only** dependencies.

For the phased delivery checklist, see Phase 0 Day 4 in [`docs/full-context.md`](../docs/full-context.md).

## Environments

| Environment | Purpose | Notes |
|-------------|---------|--------|
| **dev** | Engineer laptops / compose stack | Uses root `docker-compose.yml`; env vars in `.env` (not committed). |
| **staging** | Pre-production validation | Mirrors prod topology at smaller SKUs; synthetic data OK. |
| **prod** | Live traffic | Strict IAM, backups, alerts, change windows. |

Naming convention (recommended): resource labels `app=streamora`, `env=staging|prod`.

## Local stack (`docker-compose.yml`)

| Service | Port | Credentials / notes |
|---------|------|---------------------|
| PostgreSQL 15 | `5432` | User `streamora`, password `streamora`, database `streamora` |
| Redis 7 | `6379` | No auth (dev only) |
| Keycloak 24 (`start-dev`) | `8080` | Admin `admin` / `admin` — **change for anything beyond localhost** |

**Example `DATABASE_URL` for the API** (matches compose):

```bash
DATABASE_URL="postgresql://streamora:streamora@localhost:5432/streamora"
```

Verify Docker Compose parses cleanly:

```bash
./infra/scripts/verify-local.sh
# or: docker compose config
```

## GCP baseline (targets)

These are the deployable surfaces described in [`docs/full-context.md`](../docs/full-context.md). Terraform/Pulumi scripts are optional follow-ups; this README is the contract.

| Concern | GCP service | Role |
|---------|-------------|------|
| Web (SSR) | **Cloud Run** | Next.js `apps/web` |
| API | **Cloud Run** | NestJS `apps/api` |
| Worker | **Cloud Run** (service or Job) | FFmpeg pipeline `apps/worker` |
| OLTP | **Cloud SQL (PostgreSQL)** | Prisma / system of record |
| Cache / rate limits | **Memorystore (Redis)** | Optional at MVP; compose proves Redis usage locally |
| Objects | **Cloud Storage** buckets | e.g. originals (private), renditions/thumbnails/captions (CDN or signed) |
| Async | **Pub/Sub** | Upload/process events, DLQ pattern |
| Edge | **Cloud CDN + HTTPS LB** | In front of public/object surfaces when HLS/CDN is enabled |
| Auth | **Keycloak** (self-managed VM/GKE or hosted equivalent) | JWT issuer for API |

## Secrets

| Approach | Use |
|----------|-----|
| **Local** | `.env` files (never commit secrets). |
| **GCP** | **Secret Manager** for DB URLs, JWT/Webhook secrets, GCS keys, Keycloak client secrets; inject via Cloud Run secrets/env. |

Minimum secrets for deploy: `DATABASE_URL`, Keycloak/OIDC settings, GCS bucket names + IAM workload identity, Pub/Sub topic names.

## CI/CD outline

- **CI**: GitHub Actions runs install → Prisma `generate` → lint → build for `api`, `web`, `worker` (see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).
- **CD** (later): push images to Artifact Registry → deploy Cloud Run revisions per environment; run migrations from CI or a dedicated step with Cloud SQL access.

## Scripts

| Script | Purpose |
|--------|---------|
| [`scripts/verify-local.sh`](./scripts/verify-local.sh) | Quick checks: Docker available, `docker compose config` valid |
