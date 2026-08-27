# syntax=docker/dockerfile:1

FROM node:20-bookworm AS base
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm install --frozen-lockfile --filter worker...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY apps/worker ./apps/worker
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm --filter worker exec prisma generate --schema=../api/prisma/schema.prisma
RUN pnpm --filter worker build
RUN pnpm deploy --filter=worker --prod --legacy /prod/worker
RUN cp -r apps/worker/dist /prod/worker/dist
RUN PRISMA_SRC="$(find /app -type d -path '*/node_modules/.prisma' | head -1)" && \
    PRISMA_DEST="$(find /prod/worker/node_modules/.pnpm -type d -path '*/@prisma+client*/node_modules' | head -1)" && \
    cp -r "$PRISMA_SRC" "$PRISMA_DEST/.prisma"

FROM node:20-bookworm AS runner
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /prod/worker ./

CMD ["node", "dist/worker.js"]
