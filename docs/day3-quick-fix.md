# Day 3 Quick Fix - Prisma Migration

## Simple Solution (No extra packages needed)

Prisma automatically looks for `.env` in parent directories, but if it doesn't find it, create a symlink:

```bash
# From repo root
cd apps/api
ln -s ../../.env .env

# Verify symlink created
ls -la .env

# Now run migration
pnpm prisma migrate dev --name init_day3
pnpm prisma generate
```

## Alternative: Run with explicit env

If symlink doesn't work, you can export the variable:

```bash
# From repo root
cd apps/api

# Load DATABASE_URL from root .env
export $(grep DATABASE_URL ../../.env | xargs)

# Run migration
pnpm prisma migrate dev --name init_day3
```

## Verify Before Migration

```bash
# Check Postgres is running
docker ps | grep postgres

# Test connection
docker exec -it streamora-postgres psql -U streamora -d streamora -c "SELECT 1;"
```

If connection works, migration should work too!
