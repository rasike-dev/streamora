# Day 8 - Environment Variable Fix

## Problem

Prisma CLI doesn't automatically read from the root `.env` file. When running `pnpm prisma migrate dev` from `apps/api`, it looks for `DATABASE_URL` in `apps/api/.env`, but the variable is in the root `.env`.

## Solution Options

### Option 1: Create apps/api/.env (Simplest) ✅

Create `apps/api/.env` with just the DATABASE_URL:

```bash
# From repo root
cd apps/api
echo "DATABASE_URL=postgresql://streamora:streamora@localhost:5432/streamora" > .env
cd ../../
```

**Note**: Replace the DATABASE_URL value with the one from your root `.env` file.

Then run Prisma commands normally:

```bash
cd apps/api
pnpm prisma migrate dev --name day8_hls
pnpm prisma generate
```

### Option 2: Manual Export (No file needed)

Export the variable before running Prisma:

```bash
# From apps/api directory
export $(grep DATABASE_URL ../../.env | xargs)
pnpm prisma migrate dev --name day8_hls
pnpm prisma generate
```

### Option 3: Use dotenv-cli (If you prefer)

Install dotenv-cli:

```bash
# From repo root
cd apps/api
pnpm add -D dotenv-cli
cd ../../
```

Then use the helper scripts:

```bash
cd apps/api
pnpm prisma:migrate dev --name day8_hls
pnpm prisma:generate
```

## Recommended Approach

**Option 1** is the simplest and most reliable. Just create `apps/api/.env` with your DATABASE_URL from the root `.env` file.
