# Troubleshooting 401 Unauthorized Errors

## Issue: `/me` endpoint returns 401

### Common Causes

1. **Token not stored in localStorage**
2. **Token expired**
3. **Token validation fails in API**
4. **Environment variables not set correctly**
5. **CORS issues**

## Debugging Steps

### 1. Check Token Storage

Open browser DevTools → Console and run:

```javascript
// Check if token exists
localStorage.getItem("access_token")

// If null, token wasn't stored - check callback page
// If exists, copy it to decode
```

### 2. Decode Token

1. Copy the token from localStorage
2. Go to https://jwt.io
3. Paste token in "Encoded" section
4. Verify:
   - `iss`: Should be `http://localhost:8080/realms/streamora`
   - `aud`: Should be `streamora-web`
   - `exp`: Should be in the future (not expired)
   - `realm_access.roles`: Should contain roles array

### 3. Check API Environment Variables

Verify API has correct environment variables in root `.env`:

```bash
KEYCLOAK_ISSUER=http://localhost:8080/realms/streamora
KEYCLOAK_AUDIENCE=streamora-web
```

**Test if API can reach Keycloak**:

```bash
curl http://localhost:8080/realms/streamora/protocol/openid-connect/certs
```

Should return JSON with keys.

### 4. Check API Logs

Look at API console output. With the updated code, you should see:
- JWT validation errors with details
- Token preview
- Issuer/audience values

### 5. Test Token Manually

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:8080/realms/streamora/protocol/openid-connect/token \
  -d "client_id=streamora-web" \
  -d "username=alice" \
  -d "password=alice" \
  -d "grant_type=password" \
  -d "scope=openid profile email" | jq -r '.access_token')

# Test /me endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/me
```

If this works but browser doesn't, it's a token storage/retrieval issue.

## Common Fixes

### Fix 1: Token Not Stored

**Symptom**: `localStorage.getItem("access_token")` returns `null`

**Solution**:
1. Check callback page console for errors
2. Verify token exchange succeeded
3. Check browser console for localStorage errors
4. Try clearing localStorage and logging in again

### Fix 2: Token Expired

**Symptom**: Token exists but validation fails

**Solution**:
1. Token lifespan is typically 5 minutes (Keycloak default)
2. Re-login to get fresh token
3. Or implement token refresh (future enhancement)

### Fix 3: Audience Mismatch

**Symptom**: API logs show "Invalid token: Invalid audience"

**Solution**:
1. Verify `KEYCLOAK_AUDIENCE=streamora-web` in `.env`
2. Verify token `aud` claim is `streamora-web`
3. Restart API after changing `.env`

### Fix 4: Issuer Mismatch

**Symptom**: API logs show "Invalid token: Invalid issuer"

**Solution**:
1. Verify `KEYCLOAK_ISSUER=http://localhost:8080/realms/streamora` in `.env`
2. Verify token `iss` claim matches exactly
3. No trailing slash in issuer URL

### Fix 5: JWKS Endpoint Not Reachable

**Symptom**: API logs show network/connection errors

**Solution**:
1. Verify Keycloak is running: `docker ps | grep keycloak`
2. Test JWKS endpoint: `curl http://localhost:8080/realms/streamora/protocol/openid-connect/certs`
3. Check firewall/network issues

## Quick Debug Checklist

- [ ] Token exists in localStorage?
- [ ] Token not expired? (check `exp` claim)
- [ ] Token `aud` claim is `streamora-web`?
- [ ] Token `iss` claim matches `KEYCLOAK_ISSUER`?
- [ ] API environment variables set correctly?
- [ ] API restarted after changing `.env`?
- [ ] Keycloak is running?
- [ ] JWKS endpoint reachable from API?

## Enhanced Error Messages

The updated code now provides:
- Detailed error messages in dashboard
- Console logging for debugging
- Token preview in API logs
- Better error handling in callback

Check browser console and API logs for specific error messages.
