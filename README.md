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
