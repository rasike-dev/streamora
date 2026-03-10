# Day 15 - Worker Prisma Client Fix

## Problem

Worker shows TypeScript error:
```
error TS2353: Object literal may only specify known properties, and 'source' does not exist in type 'VideoThumbnailWhereInput'.
```

This happens because the Prisma client hasn't been regenerated after adding the `source` field to the `VideoThumbnail` model.

## Solution

### Step 1: Run Prisma Migration (if not done)

```bash
cd apps/api
pnpm prisma migrate dev --name add_thumbnail_source
```

This will:
- Add the `ThumbnailSource` enum
- Add the `source` column to `VideoThumbnail` table (default: AUTO)
- Add new indexes

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
- No TypeScript errors about `source` field
- Worker starts successfully
- Can access `prisma.videoThumbnail.deleteMany({ where: { source: 'AUTO' } })`

## Why This Happens

The worker uses a symlink to the API's Prisma folder (`apps/worker/prisma -> ../api/prisma`), so both apps share the same Prisma client. After adding `source` to the schema, the client must be regenerated to include the new field.

## Alternative: Temporary Workaround

If you can't run the migration right now, you can temporarily comment out the `source` filter in the worker:

```typescript
// Temporarily delete all thumbnails (will be fixed after migration)
await prisma.videoThumbnail.deleteMany({
  where: { videoId: evt.videoId },
});
```

But this is **not recommended** as it will delete CUSTOM thumbnails too. Better to run the migration first.
