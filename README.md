# Streamora

GCP Self-Managed Video Uploading Platform

## Development Setup

### Prerequisites
- Node.js 18+ 
- pnpm (`npm install -g pnpm`)
- Docker and Docker Compose

### Initial Setup

1. Install dependencies:
```bash
pnpm install
```

2. Start local infrastructure (Postgres + Redis):
```bash
docker compose up -d
```

3. Start all services:
```bash
pnpm dev
```

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
│   ├── shared/       # Shared types, DTOs
│   └── config/       # Shared configs
└── infra/            # GCP deployment scripts
```

## Implementation Phases

See [docs/full-context.md](docs/full-context.md) for complete architecture and implementation plan.

- **Phase 0** (Days 1-4): Foundations
- **Phase 1** (Days 5-12): MVP Core
- **Phase 2** (Days 13-21): Premium Layer
