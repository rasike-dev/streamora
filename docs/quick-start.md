# Quick Start Guide

## Running Apps Separately

### Web App (Next.js)
```bash
# From repo root
pnpm dev:web
```

**Alternative:**
```bash
pnpm --filter web dev
```

**Runs on:** http://localhost:3000

---

### API (NestJS)
```bash
# From repo root
pnpm dev:api
```

**Alternative:**
```bash
pnpm --filter api start:dev
```

**Runs on:** http://localhost:3001

---

### Worker (FFmpeg Processing)
```bash
# From repo root
pnpm dev:worker
```

**Alternative:**
```bash
pnpm --filter worker dev
```

**What it does:** Listens to Pub/Sub for `video.uploaded` events and processes videos (thumbnails + HLS)

---

## Run All Apps Together

```bash
# From repo root
pnpm dev
```

This uses `concurrently` to run all three apps in parallel.

---

## Prisma Commands

### Run Migration
```bash
# From repo root
cd apps/api
pnpm prisma migrate dev --name <migration_name>
```

### Generate Prisma Client
```bash
# From repo root
cd apps/api
pnpm prisma generate
```

**Note:** Make sure `apps/api/.env` exists with `DATABASE_URL`, or export it:
```bash
export $(grep DATABASE_URL ../../.env | xargs)
```

---

## Environment Setup

### Required Environment Variables

**Root `.env`** (or `apps/api/.env` for Prisma):
- `DATABASE_URL=postgresql://streamora:streamora@localhost:5432/streamora`
- `GCP_PROJECT_ID=your-project-id`
- `GCS_BUCKET_ORIGINALS=streamora-originals-dev`
- `GCS_BUCKET_THUMBS=streamora-thumbs-dev`
- `GCS_BUCKET_RENDITIONS=streamora-renditions-dev`
- `PUBSUB_TOPIC_VIDEO_UPLOADED=video.uploaded`
- `PUBSUB_SUBSCRIPTION_VIDEO_UPLOADED=video-uploaded-dev-sub`
- `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`

**Web `.env.local`** (optional):
- `NEXT_PUBLIC_API_URL=http://localhost:3001`

---

## Ports

- **Web**: 3000
- **API**: 3001
- **Keycloak**: 8080
- **PostgreSQL**: 5432
- **Redis**: 6379

---

## First Time Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start Docker services:**
   ```bash
   docker compose up -d
   ```

3. **Run Prisma migrations:**
   ```bash
   cd apps/api
   pnpm prisma migrate dev
   pnpm prisma generate
   ```

4. **Start apps:**
   ```bash
   # All together
   pnpm dev
   
   # Or separately
   pnpm dev:web    # Terminal 1
   pnpm dev:api    # Terminal 2
   pnpm dev:worker # Terminal 3
   ```

---

## Troubleshooting

### "DATABASE_URL not found" (Prisma)
Create `apps/api/.env` with:
```bash
DATABASE_URL=postgresql://streamora:streamora@localhost:5432/streamora
```

### "Port already in use"
Stop the conflicting process or change the port in the app config.

### "Module not found"
Run `pnpm install` from the root directory.
