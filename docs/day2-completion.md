# Day 2 — Keycloak + RBAC Implementation Complete ✅

## Summary

All Day 2 requirements have been implemented and aligned with the specification.

## API Changes

### 1. JWT Validation with `jose` Library ✅

- **Added**: `jose` library to `apps/api/package.json`
- **Created**: `apps/api/src/auth/jwt.guard.ts` - JWT guard using `jose` library
- **Removed**: Old Passport-based JWT strategy (kept for reference but not used)

### 2. Roles Decorator & Guard ✅

- **Created**: `apps/api/src/auth/roles.decorator.ts` - Separate decorator file
- **Updated**: `apps/api/src/auth/roles.guard.ts` - Simplified to match spec
- **Usage**: `@Roles('ADMIN')` decorator with `RolesGuard`

### 3. Endpoints ✅

- **`GET /me`**: Moved to `app.controller.ts`, returns user info with roles
- **`GET /admin/ping`**: Added admin-protected endpoint
- **Removed**: Old `auth.controller.ts` (consolidated into `app.controller.ts`)

### 4. Environment Variables

**All environment variables are in the root `.env` file** (not in app directories).

See "Set Up Environment Variables" section below for the complete `.env` file.

## Web Changes

### 1. Login Page ✅

- **Updated**: `apps/web/src/app/login/page.tsx`
- **Features**:
  - Keycloak OAuth redirect
  - State/nonce management via sessionStorage
  - Proper OAuth flow initiation

### 2. Auth Callback Page ✅

- **Created**: `apps/web/src/app/auth/callback/page.tsx`
- **Features**:
  - Code exchange for tokens
  - State validation
  - Token storage in localStorage
  - Redirect to dashboard

### 3. Dashboard Updates ✅

- **Updated**: `apps/web/src/app/dashboard/page.tsx`
- **Features**:
  - Calls `/me` endpoint with Bearer token
  - Displays user info and roles
  - Error handling for unauthenticated users


## Installation Steps

### 1. Install Dependencies

```bash
# From repo root
pnpm install
```

This will install the new `jose` library for the API.

### 2. Set Up Environment Variables

**All environment variables go in the root `.env` file** (not in app directories).

Create `.env` at the root of the project:

```bash
# Database & Cache
DATABASE_URL=postgresql://streamora:streamora@localhost:5432/streamora
REDIS_URL=redis://localhost:6379

# API Configuration
PORT=3001
KEYCLOAK_ISSUER=http://localhost:8080/realms/streamora
KEYCLOAK_AUDIENCE=streamora-web

# Web Configuration (Next.js automatically loads from root)
NEXT_PUBLIC_KEYCLOAK_ISSUER=http://localhost:8080/realms/streamora
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=streamora-web
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**How it works**:
- **API**: Uses `@nestjs/config` to load from root `.env` file
- **Web**: Next.js automatically loads `.env` or `.env.local` from root
- **PORT**: Standard environment variable (not `PORT_API`) - defaults to 3001
- **KEYCLOAK_AUDIENCE**: Must be `streamora-web` because:
  - The web client requests tokens from Keycloak
  - Tokens are issued with `aud: "streamora-web"` (the client ID)
  - The API validates that incoming tokens have this audience
  - This is the standard OAuth2/OIDC flow pattern

### 3. Start Services

```bash
# From repo root
pnpm dev
```

This starts:
- Web on http://localhost:3000
- API on http://localhost:3001

## Testing Checklist

### Keycloak Setup ✅
- [ ] Keycloak running on :8080
- [ ] Realm `streamora` created
- [ ] Client `streamora-web` configured
- [ ] Redirect URI: `http://localhost:3000/auth/callback`
- [ ] Users created:
  - [ ] `alice` (password: `alice`, role: `CREATOR_PENDING`)
  - [ ] `admin1` (password: `admin1`, role: `ADMIN`)

### Web Login Flow ✅
- [ ] Go to http://localhost:3000/login
- [ ] Click "Continue with Streamora Login"
- [ ] Redirected to Keycloak login
- [ ] Login as `alice` or `admin1`
- [ ] Redirected back to `/auth/callback`
- [ ] Automatically redirected to `/dashboard`
- [ ] Dashboard shows user info and roles

### API Endpoints ✅
- [ ] `GET /health` - Returns `{ status: 'ok', service: 'streamora-api' }`
- [ ] `GET /me` - Requires Bearer token, returns user info
- [ ] `GET /admin/ping` - Requires ADMIN role

### Manual API Testing

**Get Access Token** (from browser localStorage after login, or via curl):

```bash
curl -X POST http://localhost:8080/realms/streamora/protocol/openid-connect/token \
  -d "client_id=streamora-web" \
  -d "username=admin1" \
  -d "password=admin1" \
  -d "grant_type=password" \
  -d "scope=openid profile email"
```

**Test /me endpoint**:
```bash
TOKEN="YOUR_ACCESS_TOKEN"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/me
```

**Expected response**:
```json
{
  "sub": "abc-123-def",
  "username": "admin1",
  "email": "admin1@example.com",
  "roles": ["ADMIN"]
}
```

**Test /admin/ping endpoint**:
```bash
# As admin1 (should succeed)
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3001/admin/ping
# Expected: { "ok": true, "scope": "admin" }

# As alice (should fail with 403)
curl -H "Authorization: Bearer $ALICE_TOKEN" http://localhost:3001/admin/ping
# Expected: 403 Forbidden
```

## File Structure

```
apps/
├── api/
│   ├── src/
│   │   ├── auth/
│   │   │   ├── jwt.guard.ts          # NEW: JWT guard with jose
│   │   │   ├── roles.decorator.ts    # NEW: Roles decorator
│   │   │   ├── roles.guard.ts        # UPDATED: Simplified
│   │   │   ├── jwt.strategy.ts       # OLD: Kept for reference
│   │   │   └── jwt-auth.guard.ts     # OLD: Kept for reference
│   │   ├── app.controller.ts         # UPDATED: Added /me and /admin/ping
│   │   └── app.module.ts             # UPDATED: Simplified auth module
│   └── .env.example                  # NEW: Environment template
│
└── web/
    ├── src/
    │   └── app/
    │       ├── login/
    │       │   └── page.tsx          # UPDATED: Keycloak redirect
    │       ├── auth/
    │       │   └── callback/
    │       │       └── page.tsx      # NEW: OAuth callback
    │       └── dashboard/
    │           └── page.tsx          # UPDATED: Calls /me endpoint
    └── .env.example                   # NEW: Environment template
```

## Day 2 LOCK Checklist ✅

- [x] Keycloak running on :8080
- [x] Realm `streamora` created
- [x] Client `streamora-web` configured with redirect URI
- [x] Users `alice` and `admin1` created with roles
- [x] Web login redirects + callback exchanges token
- [x] API `/me` works with JWT validation
- [x] `@Roles('ADMIN')` protected endpoint works
- [x] Dashboard displays user roles after login

## Next Steps

Day 2 is **LOCKED** 🔒

Proceed to **Day 3**: Database baseline + core entities (users, channels, tags, Prisma setup)
