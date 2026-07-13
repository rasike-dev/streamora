# syntax=docker/dockerfile:1

FROM node:20-bookworm AS base
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
RUN corepack enable
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

FROM node:20-bookworm AS runner
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/node_modules/.prisma ./node_modules/.prisma

CMD ["node", "dist/worker.js"]
