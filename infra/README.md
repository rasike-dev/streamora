# Streamora — infrastructure blueprint

This folder documents **how Streamora maps to GCP** and how environments are organized. It complements the root [`docker-compose.yml`](../docker-compose.yml), which runs **local-only** dependencies.

For the phased delivery checklist and **complete feature inventory** (Days 1–27), see [`docs/full-context.md`](../docs/full-context.md).

## Related documentation

| Document | Contents |
|----------|----------|
| [`docs/full-context.md`](../docs/full-context.md) | Architecture, roles, lifecycle, phased implementation (canonical) |
| [`docs/architecture-summary.md`](../docs/architecture-summary.md) | Technical stack decisions, data model, flows |
| [`docs/product-features-overview.md`](../docs/product-features-overview.md) | Stakeholder-facing feature guide |
| [`docs/clerk-setup.md`](../docs/clerk-setup.md) | Auth provisioning |
| [`docs/production-runbook.md`](../docs/production-runbook.md) | Deploy, migrate, ops |
| [`docs/test-plan.md`](../docs/test-plan.md) | Manual verification checklist |
| [`docs/stakeholder-onboarding.md`](../docs/stakeholder-onboarding.md) | Invite → publish workflow |

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

Auth is handled by **Clerk** (cloud). See [`docs/clerk-setup.md`](../docs/clerk-setup.md).

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
| Auth | **Clerk** (managed) | JWT issuer for API; see [`docs/clerk-setup.md`](../docs/clerk-setup.md) |

## Secrets

| Approach | Use |
|----------|-----|
| **Local** | `.env` files (never commit secrets). |
| **GCP** | **Secret Manager** for DB URLs, Clerk secrets, GCS IAM, Pub/Sub; inject via Cloud Run secrets/env. |

Minimum secrets for deploy: `DATABASE_URL`, Clerk settings (`CLERK_SECRET_KEY`, `CLERK_JWKS_URL`, `CLERK_JWT_ISSUER`), GCS bucket names + IAM workload identity, Pub/Sub topic names, `SCHEDULER_SECRET`.

## Scripts

| Script | Purpose |
|--------|---------|
| [`scripts/verify-local.sh`](./scripts/verify-local.sh) | Quick checks: Docker available, `docker compose config` valid |
| [`scripts/provision-staging.sh`](./scripts/provision-staging.sh) | Provision GCP staging resources (Cloud SQL, GCS, Pub/Sub, Artifact Registry) |
| [`scripts/deploy-staging.sh`](./scripts/deploy-staging.sh) | Deploy Cloud Run services from Artifact Registry images |
| [`scripts/setup-domain.sh`](./scripts/setup-domain.sh) | Map custom domains and document CDN/env updates |

See [`env.production.example`](./env.production.example) for production environment variables.

## CI/CD

- **CI**: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — lint, build, test on push/PR
- **CD**: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) — build images, push to Artifact Registry, deploy Cloud Run, migrate DB
