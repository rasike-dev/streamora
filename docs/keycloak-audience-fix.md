# Fix: Audience Not Set in Keycloak Tokens

## Problem

Tokens issued by Keycloak don't include the `aud` (audience) claim, or it's not set to `streamora-web`. This causes 401 errors when the API validates tokens.

## Solution: Add Audience Mapper

### Method 1: Using Client's Dedicated Scope (Recommended)

1. **Go to Client**:
   - Navigate to **Clients** → **streamora-web**

2. **Access Client Scopes**:
   - Click **"Client scopes"** tab
   - Look for **"streamora-web-dedicated"** scope
   - If it doesn't exist, Keycloak creates it automatically when you assign a mapper

3. **Add Audience Mapper**:
   - Click on **"streamora-web-dedicated"** scope (or create it)
   - Go to **"Mappers"** tab
   - Click **"Add mapper"** → **"By configuration"**
   - Select **"Audience"** from the list

4. **Configure Mapper**:
   - **Name**: `audience-mapper`
   - **Included Client Audience**: `streamora-web` ✅
   - **Add to access token**: `ON` ✅
   - **Add to ID token**: `ON` ✅ (optional)
   - Click **"Save"**

### Method 2: Create Custom Client Scope

1. **Create Scope**:
   - Go to **Client scopes** (left sidebar)
   - Click **"Create client scope"**
   - **Name**: `streamora-web-audience`
   - **Protocol**: `openid-connect`
   - Click **"Save"**

2. **Add Audience Mapper**:
   - Go to **"Mappers"** tab
   - Click **"Add mapper"** → **"By configuration"**
   - Select **"Audience"**
   - Configure:
     - **Name**: `audience-mapper`
     - **Included Client Audience**: `streamora-web`
     - **Add to access token**: `ON` ✅
   - Click **"Save"**

3. **Assign to Client**:
   - Go to **Clients** → **streamora-web**
   - Click **"Client scopes"** tab
   - Under **"Default client scopes"**, click **"Add client scope"**
   - Select `streamora-web-audience`
   - Set as **Default** (not Optional)
   - Click **"Add"**

### Method 3: Use Built-in Client ID Mapper

1. **Go to Client Scopes**:
   - Navigate to **Client scopes** (left sidebar)
   - Click on **"roles"** scope

2. **Check for Client ID Mapper**:
   - Go to **"Mappers"** tab
   - Look for mapper named **"Client ID"** or **"audience"**
   - If it exists, verify:
     - **Add to access token**: `ON` ✅
     - **Included Client Audience**: `streamora-web`

3. **If Missing, Add It**:
   - Click **"Add mapper"** → **"By configuration"**
   - Select **"Audience"** or **"Client ID"**
   - Configure:
     - **Name**: `client-id-audience`
     - **Included Client Audience**: `streamora-web`
     - **Add to access token**: `ON` ✅
   - Click **"Save"**

## Verification

### 1. Test Token Generation

```bash
curl -X POST http://localhost:8080/realms/streamora/protocol/openid-connect/token \
  -d "client_id=streamora-web" \
  -d "username=alice" \
  -d "password=alice" \
  -d "grant_type=password" \
  -d "scope=openid profile email"
```

### 2. Decode Token

1. Copy the `access_token` from the response
2. Go to https://jwt.io
3. Paste token in "Encoded" section
4. Verify the payload contains:
   ```json
   {
     "aud": "streamora-web",
     "iss": "http://localhost:8080/realms/streamora",
     ...
   }
   ```

### 3. Test API Endpoint

```bash
TOKEN="your_access_token_here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/me
```

Should return user info, not 401.

## Troubleshooting

### Token still doesn't have `aud` claim

1. **Check mapper is assigned**:
   - Go to **Clients** → **streamora-web** → **Client scopes**
   - Verify the scope with audience mapper is in **"Default client scopes"**

2. **Check mapper configuration**:
   - Ensure **"Add to access token"** is `ON`
   - Ensure **"Included Client Audience"** is exactly `streamora-web`

3. **Try different scope**:
   - If using dedicated scope doesn't work, try Method 2 (custom scope)

4. **Restart Keycloak** (if using Docker):
   ```bash
   docker restart streamora-keycloak
   ```

### Multiple audience values

If token has multiple audiences (array), the API validation should still work as long as `streamora-web` is in the array. The `jose` library's `jwtVerify` will accept it.

## Quick Fix Summary

**Fastest method**:
1. Clients → streamora-web → Client scopes
2. Click on "streamora-web-dedicated" (or create it)
3. Mappers → Add mapper → Audience
4. Set "Included Client Audience" to `streamora-web`
5. Enable "Add to access token"
6. Save
7. Test token generation and verify `aud` claim

After this fix, tokens will include `aud: "streamora-web"` and API validation will work.
