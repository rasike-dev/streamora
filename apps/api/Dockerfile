# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --filter api...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api build
RUN pnpm deploy --filter=api --prod --legacy /prod/api
RUN cp -r apps/api/dist /prod/api/dist
RUN PRISMA_SRC="$(find /app -type d -path '*/node_modules/.prisma' | head -1)" && \
    PRISMA_DEST="$(find /prod/api/node_modules/.pnpm -type d -path '*/@prisma+client*/node_modules' | head -1)" && \
    cp -r "$PRISMA_SRC" "$PRISMA_DEST/.prisma"

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /prod/api ./

EXPOSE 3001
CMD ["node", "dist/main.js"]
