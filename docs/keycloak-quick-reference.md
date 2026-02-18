# Keycloak Quick Reference

Quick checklist and reference for Keycloak configuration.

## Configuration Summary

### Realm
- **Name**: `streamora`
- **URL**: http://localhost:8080/realms/streamora

### Client
- **Client ID**: `streamora-web` (ONLY ONE CLIENT NEEDED)
- **Type**: Public (Client authentication: OFF)
- **Flows**: Standard flow ON, Direct access grants ON
- **Redirect URI**: `http://localhost:3000/auth/callback`
- **Web Origins**: `http://localhost:3000`
- **Note**: API validates tokens from this client - no separate `streamora-api` client needed

### Roles (Realm Roles)
1. `ADMIN`
2. `MODERATOR`
3. `CREATOR_PENDING`
4. `CREATOR_APPROVED`
5. `VIEWER`

### Test Users
| Username | Password | Role |
|----------|----------|------|
| `alice` | `alice` | CREATOR_PENDING |
| `admin1` | `admin1` | ADMIN |

## Quick Setup Checklist

```
□ Access Keycloak Admin Console (http://localhost:8080)
□ Create realm: streamora
□ Create client: streamora-web (ONLY ONE CLIENT NEEDED)
  □ Public client (authentication OFF)
  □ Standard flow ON
  □ Direct access grants ON
  □ Redirect URI: http://localhost:3000/auth/callback
  □ Web origins: http://localhost:3000
  □ Note: No streamora-api client needed for current setup
□ Configure roles scope mapper
  □ realm_access.roles claim added to access token
□ Create 5 realm roles (ADMIN, MODERATOR, CREATOR_PENDING, CREATOR_APPROVED, VIEWER)
□ Create user: alice (password: alice, role: CREATOR_PENDING)
□ Create user: admin1 (password: admin1, role: ADMIN)
□ Test token generation
  □ Verify token includes realm_access.roles
  □ Verify token aud claim is streamora-web
```

## Token Test Command

```bash
# Get token for alice
curl -X POST http://localhost:8080/realms/streamora/protocol/openid-connect/token \
  -d "client_id=streamora-web" \
  -d "username=alice" \
  -d "password=alice" \
  -d "grant_type=password" \
  -d "scope=openid profile email"

# Get token for admin1
curl -X POST http://localhost:8080/realms/streamora/protocol/openid-connect/token \
  -d "client_id=streamora-web" \
  -d "username=admin1" \
  -d "password=admin1" \
  -d "grant_type=password" \
  -d "scope=openid profile email"
```

## Keycloak Endpoints

- **Admin Console**: http://localhost:8080
- **Token Endpoint**: http://localhost:8080/realms/streamora/protocol/openid-connect/token
- **Authorization Endpoint**: http://localhost:8080/realms/streamora/protocol/openid-connect/auth
- **JWKS Endpoint**: http://localhost:8080/realms/streamora/protocol/openid-connect/certs

## Token Claims to Verify

When decoding a token at https://jwt.io, verify:

```json
{
  "iss": "http://localhost:8080/realms/streamora",
  "aud": "streamora-web",
  "sub": "user-uuid",
  "email": "alice@example.com",
  "preferred_username": "alice",
  "realm_access": {
    "roles": ["CREATOR_PENDING"]
  }
}
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Token missing roles | Check roles scope mapper, ensure "Add to access token" is ON |
| Redirect URI mismatch | Verify exact match in client settings |
| Can't login | Check user is enabled, password is set, not temporary |
| Token validation fails | Verify KEYCLOAK_ISSUER and KEYCLOAK_AUDIENCE in .env |

For detailed instructions, see `docs/keycloak-setup.md`.
