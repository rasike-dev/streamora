# Day 2 Environment Variables Guide

## Root-Level Environment Variables

**All environment variables are stored in the root `.env` file**, not in individual app directories.

Create `.env` at the root of the project:

```bash
# Database & Cache
DATABASE_URL=postgresql://streamora:streamora@localhost:5432/streamora
REDIS_URL=redis://localhost:6379

# API Configuration
PORT=3001
KEYCLOAK_ISSUER=http://localhost:8080/realms/streamora
KEYCLOAK_AUDIENCE=streamora-web

# Web Configuration
NEXT_PUBLIC_KEYCLOAK_ISSUER=http://localhost:8080/realms/streamora
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=streamora-web
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## How It Works

### API (NestJS)
- Uses `@nestjs/config` module
- Configured to load from root `.env` file
- All environment variables are available via `process.env`

### Web (Next.js)
- Next.js automatically loads `.env`, `.env.local`, `.env.development.local` from root
- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Other variables are only available server-side

### Explanation

#### `PORT=3001`
- **Standard convention**: Use `PORT` (not `PORT_API`)
- The API code supports both for backward compatibility, but `PORT` is preferred
- Defaults to `3001` if not set

#### `KEYCLOAK_ISSUER=http://localhost:8080/realms/streamora`
- **Format**: `http://<keycloak-host>/realms/<realm-name>`
- Used to:
  - Fetch JWKS (public keys) for token validation
  - Validate token issuer claim
- Must match exactly what Keycloak issues in tokens

#### `KEYCLOAK_AUDIENCE=streamora-web`
- **Why `streamora-web` and not `streamora-api`?**
  - The **web client** (`streamora-web`) requests tokens from Keycloak
  - Keycloak issues tokens with `aud: "streamora-web"` (the client ID)
  - The **API validates** that incoming tokens have this audience
  - This is the standard OAuth2/OIDC flow: client gets token → sends to resource server
- **Alternative approach** (not recommended for this setup):
  - Create separate `streamora-api` client in Keycloak
  - Use client credentials flow for service-to-service
  - Would require different token flow

## Web Environment Variables (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_KEYCLOAK_ISSUER=http://localhost:8080/realms/streamora
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=streamora-web
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Explanation

#### `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=streamora-web`
- The client ID registered in Keycloak
- Used in OAuth authorization request
- Must match the client configured in Keycloak admin console

#### `NEXT_PUBLIC_KEYCLOAK_ISSUER`
- Same as API's `KEYCLOAK_ISSUER`
- Used to construct OAuth endpoints

#### `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- Base URL of the web application
- Used for redirect URIs in OAuth flow

#### `NEXT_PUBLIC_API_URL=http://localhost:3001`
- Base URL of the API
- Used when making API calls from the frontend

## Keycloak Client Configuration

In Keycloak Admin Console:

1. **Client ID**: `streamora-web`
2. **Client type**: OpenID Connect
3. **Valid redirect URIs**: `http://localhost:3000/auth/callback`
4. **Web origins**: `http://localhost:3000`
5. **Access token audience**: Will be `streamora-web` (the client ID)

## Token Flow

```
1. User clicks login → Web redirects to Keycloak
2. User authenticates → Keycloak issues token with aud: "streamora-web"
3. Web receives token → Stores in localStorage
4. Web calls API → Sends token in Authorization header
5. API validates token → Checks aud claim matches "streamora-web"
6. API processes request → Returns data
```

## Troubleshooting

### "Invalid token" error
- Check `KEYCLOAK_AUDIENCE` matches the client ID
- Verify token's `aud` claim: decode at https://jwt.io
- Ensure Keycloak client is configured correctly

### Port conflicts
- Change `PORT` in API `.env` if 3001 is in use
- Update `NEXT_PUBLIC_API_URL` in web `.env.local` to match

### Audience mismatch
- Token `aud` claim must equal `KEYCLOAK_AUDIENCE` value
- For standard OAuth flow, both should be `streamora-web`
