# Day 1 Verification Guide

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 18+ installed (`node --version`)
- ✅ pnpm installed (`pnpm --version`). If not: `npm install -g pnpm`
- ✅ Docker and Docker Compose installed (`docker --version`, `docker compose version`)

## Step-by-Step Verification

### 1. Install Dependencies

```bash
# From repo root
pnpm install
```

**Expected**: All packages install without errors.

**Verification**: Check that `node_modules` folders exist in:
- Root directory
- `apps/web/`
- `apps/api/`
- `apps/worker/`
- `packages/shared/`

---

### 2. Start Docker Services (Postgres + Redis)

```bash
# From repo root
docker compose up -d
```

**Expected**: Containers start successfully.

**Verification**:
```bash
# Check containers are running
docker ps

# Should show:
# - streamora-postgres (port 5432)
# - streamora-redis (port 6379)
```

**Test Postgres connection**:
```bash
docker exec -it streamora-postgres psql -U streamora -d streamora -c "SELECT version();"
```

**Test Redis connection**:
```bash
docker exec -it streamora-redis redis-cli ping
# Should return: PONG
```

---

### 3. Start All Services

```bash
# From repo root
pnpm dev
```

**Expected**: Three services start:
- WEB on http://localhost:3000
- API on http://localhost:3001
- WORKER logs "Streamora Worker Booted (Day 1)"

**Verification**:

**Web App**:
- Open browser: http://localhost:3000
- Should see "Streamora" heading
- Should see three links: Login, Creator Dashboard, Admin
- Test mobile viewport (Chrome DevTools → Toggle device toolbar)
- Click each link and verify pages load

**API Health**:
```bash
# In a new terminal
curl http://localhost:3001/health
```

**Expected response**:
```json
{"status":"ok","service":"streamora-api"}
```

**API Version**:
```bash
curl http://localhost:3001/version
```

**Expected response**:
```json
{"version":"0.0.1"}
```

**Worker**:
- Check terminal output for: "Streamora Worker Booted (Day 1)"

---

### 4. Verify Project Structure

```bash
# From repo root
tree -L 2 -I node_modules
```

**Expected structure**:
```
streamora/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
├── packages/
│   └── shared/
├── docs/
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

### 5. Mobile-First Layout Check

1. Open http://localhost:3000 in browser
2. Open Chrome DevTools (F12)
3. Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
4. Select a mobile device (e.g., iPhone 12 Pro)
5. Verify:
   - Layout is responsive
   - Text is readable
   - Links are tappable
   - No horizontal scrolling

---

## Day 1 Acceptance Checklist

- [ ] `pnpm install` completes without errors
- [ ] `docker compose up -d` starts Postgres and Redis
- [ ] `docker ps` shows both containers running
- [ ] Postgres responds to connection test
- [ ] Redis responds with PONG
- [ ] `pnpm dev` starts all three services
- [ ] Web app loads at http://localhost:3000
- [ ] Home page shows "Streamora" heading and three links
- [ ] Login page loads at http://localhost:3000/login
- [ ] Dashboard page loads at http://localhost:3000/dashboard
- [ ] Admin page loads at http://localhost:3000/admin
- [ ] API `/health` returns `{"status":"ok","service":"streamora-api"}`
- [ ] API `/version` returns `{"version":"0.0.1"}`
- [ ] Worker logs "Streamora Worker Booted (Day 1)"
- [ ] Mobile viewport renders correctly
- [ ] Project structure matches expected layout

---

## Troubleshooting

### Port Already in Use

If port 3000 or 3001 is already in use:

**Web (3000)**:
- Kill process: `lsof -ti:3000 | xargs kill -9`
- Or change port in `apps/web/package.json`: `"dev": "next dev -p 3002"`

**API (3001)**:
- Set `PORT_API=3002` in `.env` file
- Or kill process: `lsof -ti:3001 | xargs kill -9`

### Docker Issues

**Containers won't start**:
```bash
# Check Docker is running
docker info

# Remove and recreate containers
docker compose down
docker compose up -d
```

**Port conflicts**:
- Edit `docker-compose.yml` to change ports if 5432 or 6379 are in use

### pnpm Issues

**Workspace not found**:
- Ensure `pnpm-workspace.yaml` exists in root
- Run `pnpm install` from root directory

**Module not found errors**:
- Delete all `node_modules` folders
- Delete `pnpm-lock.yaml`
- Run `pnpm install` again

---

## Next Steps

Once all checks pass ✅, Day 1 is **LOCKED** 🔒

Proceed to **Day 2**: Keycloak + RBAC wiring (login flow + /me + role guards)
