# Day 2 — Keycloak + RBAC Setup Guide

## Environment Variables

Add these to your `.env` file (create from `.env.example`):

```bash
KEYCLOAK_ISSUER=http://localhost:8080/realms/streamora
```

Or if you're using a different Keycloak URL:
```bash
KEYCLOAK_ISSUER=http://localhost:8080/realms/streamora
```

## API Implementation Complete

The following has been implemented:

### 1. JWT Strategy (`apps/api/src/auth/jwt.strategy.ts`)
- Validates JWT tokens from Keycloak
- Uses JWKS (JSON Web Key Set) for public key validation
- Extracts user info and roles from token
- Returns user object with: `userId`, `email`, `username`, `roles`

### 2. Role Guard (`apps/api/src/auth/roles.guard.ts`)
- `@Roles()` decorator to protect endpoints
- Checks if user has required roles
- Usage: `@Roles(UserRole.ADMIN, UserRole.MODERATOR)`

### 3. JWT Auth Guard (`apps/api/src/auth/jwt-auth.guard.ts`)
- Protects endpoints requiring authentication
- Usage: `@UseGuards(JwtAuthGuard)`

### 4. `/me` Endpoint (`apps/api/src/auth/auth.controller.ts`)
- Returns current user profile
- Requires authentication
- Returns: `{ userId, email, username, roles }`

### 5. Test Endpoint (`apps/api/src/app.controller.ts`)
- `/admin/test` - Requires ADMIN role
- Use for testing role-based access

## Installation Steps

### 1. Install Dependencies

```bash
# From repo root
cd apps/api
pnpm install
```

Or from root:
```bash
pnpm install
```

### 2. Update Environment Variables

Create `.env` file in `apps/api/` or root (depending on your setup):

```bash
KEYCLOAK_ISSUER=http://localhost:8080/realms/streamora
PORT_API=3001
```

### 3. Start API

```bash
# From repo root
pnpm dev:api
```

Or:
```bash
cd apps/api
pnpm start:dev
```

## Testing the API

### 1. Get Access Token from Keycloak

**Option A: Using Keycloak Admin Console**
1. Go to http://localhost:8080
2. Login as admin/admin
3. Go to Realm: streamora
4. Go to Users → Select a user (e.g., `alice`)
5. Go to Credentials tab
6. Set password (if not set)
7. Use Keycloak's token endpoint:

```bash
curl -X POST http://localhost:8080/realms/streamora/protocol/openid-connect/token \
  -d "client_id=streamora-web" \
  -d "username=alice" \
  -d "password=alice" \
  -d "grant_type=password" \
  -d "scope=openid profile email"
```

**Option B: Using Keycloak's Test Client**
1. Go to Keycloak Admin → Clients → streamora-web
2. Go to "Test" tab
3. Copy the access token

### 2. Test `/me` Endpoint

```bash
# Replace YOUR_ACCESS_TOKEN with the token from step 1
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3001/me
```

**Expected response:**
```json
{
  "userId": "abc-123-def",
  "email": "alice@example.com",
  "username": "alice",
  "roles": ["CREATOR_PENDING"]
}
```

### 3. Test Admin Endpoint

```bash
# Use admin1's token
curl -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  http://localhost:3001/admin/test
```

**Expected response:**
```json
{
  "message": "Admin access granted"
}
```

**Test with non-admin user (should fail):**
```bash
# Use alice's token (CREATOR_PENDING role)
curl -H "Authorization: Bearer ALICE_ACCESS_TOKEN" \
  http://localhost:3001/admin/test
```

**Expected response:**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

## Troubleshooting

### JWT Validation Fails

**Error: "Invalid token" or "Unauthorized"**

1. Check `KEYCLOAK_ISSUER` environment variable is correct
2. Verify token is not expired
3. Check token includes `realm_access.roles` claim
4. Verify Keycloak realm name matches (should be "streamora")

### Roles Not Working

**Error: "Forbidden" even with correct role**

1. Verify token includes `realm_access.roles` in payload
2. Decode token at https://jwt.io to check claims
3. Ensure role names match exactly (case-sensitive):
   - `ADMIN`
   - `MODERATOR`
   - `CREATOR_PENDING`
   - `CREATOR_APPROVED`
   - `VIEWER`

### Keycloak Connection Issues

**Error: "getaddrinfo ENOTFOUND" or connection refused**

1. Verify Keycloak is running: `docker ps | grep keycloak`
2. Check Keycloak is accessible: `curl http://localhost:8080/realms/streamora`
3. Verify JWKS endpoint: `curl http://localhost:8080/realms/streamora/protocol/openid-connect/certs`

## Next Steps

Once API authentication is working:

1. ✅ JWT validation working
2. ✅ `/me` endpoint returns user info
3. ✅ Role guards protect admin endpoints
4. ⏭️ Wire up login flow in Next.js web app (Day 2 continuation)
