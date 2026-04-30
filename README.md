# Streamora

GCP Self-Managed Video Uploading Platform

## Development Setup

### Prerequisites
- Node.js **20+** (matches GitHub Actions CI)
- pnpm (`npm install -g pnpm` or [Corepack](https://nodejs.org/api/corepack.html))
- Docker and Docker Compose

### Initial Setup

1. Install dependencies:
```bash
pnpm install
```

2. Environment files:
```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
```
Edit `.env` and `apps/web/.env.local` if your ports or Keycloak realm/client names differ. The API resolves `DATABASE_URL` and related vars from the **repository root** `.env` (see `apps/api` `ConfigModule` `envFilePath`). The web app uses **`apps/web/.env.local`** for `NEXT_PUBLIC_*` variables.

3. Start local infrastructure (Postgres, Redis, Keycloak):
```bash
docker compose up -d
```

See [`infra/README.md`](infra/README.md) for environment mapping, GCP targets, and how local URLs align with compose.

4. Apply database migrations (from a shell at the repo root, using root `.env` for `DATABASE_URL`):
```bash
pnpm --filter api exec dotenv -e ../../.env -- prisma migrate deploy
```

For interactive migration creation during development:
```bash
pnpm --filter api exec dotenv -e ../../.env -- prisma migrate dev
```

5. (Optional) Seed demo channels/tags:
```bash
pnpm --filter api exec dotenv -e ../../.env -- prisma db seed
```

6. Keycloak: ensure your realm and OIDC client match `KEYCLOAK_ISSUER` and `NEXT_PUBLIC_KEYCLOAK_*` (realm export / setup is described in the project docs under `docs/`).

7. Start all services:
```bash
pnpm dev
```

**Worker:** `dotenv/config` loads **`apps/worker/.env`** when you run `pnpm dev:worker`. Symlink or copy the root env file if you want one source of truth, for example from the repo root: `ln -sf ../../.env apps/worker/.env` (or copy `.env` into `apps/worker/.env` on Windows).

### Running Apps Separately

**Web App (Next.js)**
```bash
pnpm dev:web
# Runs on: http://localhost:3000
```

**API (NestJS)**
```bash
pnpm dev:api
# Runs on: http://localhost:3001
```

**Worker (FFmpeg Processing)**
```bash
pnpm dev:worker
# Listens to Pub/Sub for video processing events
```

### Services

- **Web**: http://localhost:3000 (Next.js PWA)
- **API**: http://localhost:3001 (NestJS)
- **Worker**: Runs in terminal (FFmpeg processing)

### Project Structure

```
streamora/
├── apps/
│   ├── web/          # Next.js PWA
│   ├── api/          # NestJS backend
│   └── worker/       # FFmpeg processing service
├── packages/
│   └── shared/       # Shared types, DTOs
└── infra/            # GCP baseline blueprint + local helper scripts
```

## Repo scripts

From the repository root:

```bash
pnpm lint    # API + Web static analysis (CI-safe for API)
pnpm build   # prisma generate + api + web + worker
pnpm test    # API unit tests (passes when no tests are present)
```

## Implementation Phases

See [docs/full-context.md](docs/full-context.md) for complete architecture and implementation plan.

- **Phase 0** (Days 1-4): Foundations
- **Phase 1** (Days 5-12): MVP Core
- **Phase 2** (Days 13-21): Premium Layer
