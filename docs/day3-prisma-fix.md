# Day 3 Prisma Migration Fix

## Issue

Prisma CLI version mismatch - `pnpm dlx` downloads latest (7.4.0) but we need 5.x.

## Solution

Use the locally installed Prisma version instead of `pnpm dlx`.

### Option 1: Use Local Prisma (Recommended)

```bash
cd apps/api

# Install dependencies first
pnpm install

# Use local Prisma (not dlx)
pnpm prisma migrate dev --name init_day3
pnpm prisma generate
```

### Option 2: Pin Prisma Version

The package.json already specifies `prisma: "~5.19.1"`. After `pnpm install`, use:

```bash
cd apps/api
pnpm exec prisma migrate dev --name init_day3
pnpm exec prisma generate
```

### Option 3: Use npx with Local Version

```bash
cd apps/api
npx prisma@5.19.1 migrate dev --name init_day3
npx prisma@5.19.1 generate
```

## Verification

After migration:

```bash
# Check tables were created
docker exec -it streamora-postgres psql -U streamora -d streamora -c "\dt"
```

Should show all tables:
- User
- UserRole
- CreatorProfile
- Channel
- ChannelTranslation
- Tag
- TagTranslation
- Video
- VideoTranslation
- VideoChannel
- VideoTag

## If Migration Still Fails

1. **Check Prisma version**:
   ```bash
   cd apps/api
   pnpm prisma --version
   ```
   Should show 5.x.x

2. **If it shows 7.x**, reinstall:
   ```bash
   cd apps/api
   pnpm remove prisma
   pnpm add -D prisma@5.19.1
   pnpm install
   ```

3. **Then run migration**:
   ```bash
   pnpm prisma migrate dev --name init_day3
   ```
