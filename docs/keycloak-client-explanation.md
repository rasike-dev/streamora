# Keycloak Client Architecture Explanation

## Why Only One Client (streamora-web)?

### Current Architecture

```
User → Web App (streamora-web) → Gets Token → Sends to API → API Validates Token
```

In this flow:
1. **Web client** (`streamora-web`) requests tokens from Keycloak
2. Keycloak issues tokens with `aud: "streamora-web"` (the client ID)
3. **API** receives tokens from the web app
4. **API validates** that tokens have the correct audience (`streamora-web`)
5. API extracts user info and roles from the token

The API is a **resource server** that validates tokens - it doesn't need its own client.

## When Would You Need streamora-api Client?

You would create a separate `streamora-api` client **only** if:

### 1. Client Credentials Flow (Service-to-Service)

If the API needs to authenticate **as itself** (not on behalf of a user):

```
API → Keycloak → Gets Service Token → Uses for API-to-API calls
```

**Use cases**:
- API calling another service
- Background jobs authenticating
- Scheduled tasks
- Worker services

**Configuration**:
- Client authentication: `ON` (confidential)
- Service accounts: `ON`
- Standard flow: `OFF`
- Direct access grants: `OFF`

### 2. Machine-to-Machine Authentication

If you need the API to have its own identity separate from users.

### 3. Advanced Scenarios

- API acting as a client to other services
- Delegation scenarios
- Complex multi-service architectures

## Current Setup (Authorization Code Flow)

For our current setup, we use:

- **One client**: `streamora-web`
- **Flow**: Authorization Code Flow (OAuth2)
- **Token audience**: `streamora-web`
- **API role**: Resource server (validates tokens)

This is the **standard OAuth2 pattern** for web applications.

## Token Flow Diagram

```
┌─────────┐         ┌──────────┐         ┌─────────┐
│  User   │────────▶│   Web    │────────▶│ Keycloak│
│         │         │  (Client) │         │         │
└─────────┘         └──────────┘         └─────────┘
                           │                    │
                           │                    │ Token
                           │                    │ (aud: streamora-web)
                           ▼                    ▼
                    ┌──────────┐         ┌─────────┐
                    │   Web    │────────▶│   API   │
                    │  (Client)│  Token  │(Resource│
                    └──────────┘         │ Server) │
                                         └─────────┘
```

## Environment Variables

### Current Setup (One Client)

**API** (`.env`):
```bash
KEYCLOAK_ISSUER=http://localhost:8080/realms/streamora
KEYCLOAK_AUDIENCE=streamora-web  # Same as client ID
```

**Web** (`.env`):
```bash
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=streamora-web
```

### If Using Two Clients (Future)

**API** (`.env`):
```bash
KEYCLOAK_ISSUER=http://localhost:8080/realms/streamora
KEYCLOAK_AUDIENCE=streamora-api  # Different client
KEYCLOAK_CLIENT_ID=streamora-api
KEYCLOAK_CLIENT_SECRET=<secret>
```

**Web** (`.env`):
```bash
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=streamora-web
```

## Summary

| Scenario | Clients Needed | When to Use |
|----------|---------------|-------------|
| **Current setup** | `streamora-web` only | Standard web app with API |
| **Service-to-service** | `streamora-web` + `streamora-api` | API needs to authenticate as itself |
| **M2M auth** | `streamora-web` + `streamora-api` | API has separate identity |

**For Day 2 and Phase 0-1**: Only `streamora-web` is needed.

**For Phase 3+ (if needed)**: Consider adding `streamora-api` for service accounts.
