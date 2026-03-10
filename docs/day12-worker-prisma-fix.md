# Day 12 - Worker Prisma Client Fix

## Problem

Worker shows TypeScript error:
```
Property 'processingJob' does not exist on type 'PrismaClient'
```

This happens because the Prisma client hasn't been regenerated after adding the `ProcessingJob` model.

## Solution

### Step 1: Run Prisma Migration (if not done)

```bash
cd apps/api
pnpm prisma migrate dev --name day12_jobs_and_processing_failed
```

### Step 2: Regenerate Prisma Client

```bash
# From API folder (generates shared client)
cd apps/api
pnpm prisma generate
```

**OR** from worker folder (uses symlink):

```bash
cd apps/worker
pnpm prisma generate --schema=../api/prisma/schema.prisma
```

### Step 3: Restart Worker

The worker needs to be restarted to pick up the new Prisma client types:

```bash
# Stop the worker (Ctrl+C)
# Then restart:
cd apps/worker
pnpm dev
```

### Step 4: Verify

The worker should now compile without errors. You should see:
- No TypeScript errors about `processingJob`
- Worker starts successfully
- Can access `prisma.processingJob` methods

## Alternative: If Prisma Client Still Not Found

If the above doesn't work, try:

1. **Clear node_modules and reinstall**:
   ```bash
   # From root
   rm -rf node_modules
   pnpm install
   ```

2. **Regenerate from root**:
   ```bash
   # From root
   cd apps/api
   pnpm prisma generate
   ```

3. **Check Prisma client location**:
   The Prisma client should be in:
   ```
   node_modules/.pnpm/@prisma+client@5.19.1_prisma@5.19.1/node_modules/@prisma/client
   ```

## Verification

After regenerating, check that the Prisma client includes `processingJob`:

```bash
# Check if ProcessingJob is in the generated types
grep -r "processingJob" node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client
```

You should see references to `processingJob` in the generated client.
