# Day 3 Migration Steps

## Prerequisites

1. ✅ `.env` file exists at root with `DATABASE_URL`
2. ✅ Postgres is running: `docker ps | grep postgres`
3. ✅ Prisma is installed: `cd apps/api && pnpm list prisma`

## Run Migration

### Option 1: From apps/api directory (Recommended)

```bash
# From repo root
cd apps/api

# Run migration (Prisma will look for .env in parent directories)
pnpm prisma migrate dev --name init_day3

# Generate Prisma Client
pnpm prisma generate
```

### Option 2: Specify .env file explicitly

If Prisma can't find the root `.env`, you can specify it:

```bash
cd apps/api

# Load env from root
DATABASE_URL=$(grep DATABASE_URL ../../.env | cut -d '=' -f2) pnpm prisma migrate dev --name init_day3
```

### Option 3: Create .env in apps/api (Alternative)

If parent directory lookup doesn't work, create a symlink or copy:

```bash
# From repo root
ln -s ../.env apps/api/.env

# Then run migration
cd apps/api
pnpm prisma migrate dev --name init_day3
```

## Verify Migration

After migration succeeds:

```bash
# Check tables were created
docker exec -it streamora-postgres psql -U streamora -d streamora -c "\dt"
```

Should show:
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

## Troubleshooting

### "Environment variable not found"

1. **Check .env exists at root**:
   ```bash
   ls -la .env
   cat .env | grep DATABASE_URL
   ```

2. **Verify DATABASE_URL format**:
   ```bash
   # Should be:
   DATABASE_URL=postgresql://streamora:streamora@localhost:5432/streamora
   ```

3. **Test connection**:
   ```bash
   docker exec -it streamora-postgres psql -U streamora -d streamora -c "SELECT 1;"
   ```

4. **Run from root with explicit path**:
   ```bash
   # From root
   cd apps/api
   pnpm prisma migrate dev --name init_day3 --schema=./prisma/schema.prisma
   ```

### "Connection refused"

- Ensure Postgres is running: `docker compose up -d postgres`
- Check port: `docker ps | grep postgres`
- Verify credentials match docker-compose.yml

### Migration already exists

If you need to reset:

```bash
cd apps/api
pnpm prisma migrate reset
pnpm prisma migrate dev --name init_day3
```

**Warning**: This will drop all tables and data!
