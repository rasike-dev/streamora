# Day 3 - Prisma Client Generation Fix

## Error

TypeScript errors like:
```
Property 'video' does not exist on type 'PrismaService'
Property 'user' does not exist on type 'PrismaService'
```

This means **Prisma Client hasn't been generated** yet.

## Solution

### Step 1: Generate Prisma Client

```bash
# From repo root
cd apps/api
pnpm prisma generate
```

This will:
- Read `prisma/schema.prisma`
- Generate TypeScript types
- Create Prisma Client in `node_modules/.prisma/client`

### Step 2: Verify Generation

```bash
# Check if client was generated
ls -la node_modules/.prisma/client

# Should show index.d.ts and other files
```

### Step 3: Restart TypeScript Server

In your IDE:
- **VS Code**: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
- **Cursor**: Same command

Or restart the dev server:
```bash
# Stop current dev server (Ctrl+C)
# Then restart
pnpm dev:api
```

## If Migration Not Run Yet

If you haven't run the migration yet:

```bash
cd apps/api

# 1. Run migration (creates tables)
pnpm prisma migrate dev --name init_day3

# 2. Generate client (creates TypeScript types)
pnpm prisma generate
```

## Verify Everything Works

After generating:

1. **TypeScript errors should disappear**
2. **Auto-complete should work** for `this.prisma.user`, `this.prisma.video`, etc.
3. **Dev server should compile** without errors

## Troubleshooting

### "Schema file not found"

Make sure you're in `apps/api` directory:
```bash
cd apps/api
pnpm prisma generate
```

### "DATABASE_URL not found"

Ensure `.env` file exists at root or in `apps/api`:
```bash
# Check root .env
cat .env | grep DATABASE_URL

# Or create symlink
cd apps/api
ln -s ../../.env .env
```

### Client generated but errors persist

1. **Restart TypeScript server** in IDE
2. **Clear node_modules and reinstall**:
   ```bash
   cd apps/api
   rm -rf node_modules/.prisma
   pnpm install
   pnpm prisma generate
   ```

### Migration needed first

If you see "database schema is not in sync":
```bash
cd apps/api
pnpm prisma migrate dev --name init_day3
pnpm prisma generate
```

## Quick Checklist

- [ ] Migration run: `pnpm prisma migrate dev --name init_day3`
- [ ] Client generated: `pnpm prisma generate`
- [ ] TypeScript server restarted
- [ ] No TypeScript errors in IDE
- [ ] Dev server compiles successfully
