# Keycloak Full Configuration Guide

Complete step-by-step instructions for configuring Keycloak for Streamora.

## Prerequisites

- Keycloak running on http://localhost:8080
- Access to Keycloak Admin Console
- Default admin credentials: `admin` / `admin`

## Step 1: Access Keycloak Admin Console

1. Open browser: http://localhost:8080
2. Click **"Administration Console"**
3. Login with:
   - Username: `admin`
   - Password: `admin`

## Step 2: Create Realm

1. In the top-left dropdown, you'll see **"master"** realm
2. Click the dropdown and select **"Create Realm"**
3. Fill in:
   - **Realm name**: `streamora`
   - **Enabled**: `ON` (default)
4. Click **"Create"**

You should now be in the `streamora` realm.

## Step 3: Create Client (streamora-web)

**Important**: We only need ONE client (`streamora-web`) for the current setup. The API validates tokens issued to this client - it doesn't need its own client.

**When would you need `streamora-api` client?**
- Only if using **client credentials flow** (service-to-service)
- Only if API needs to authenticate as itself (not on behalf of users)
- For our current **authorization code flow**, the web client gets tokens and sends them to API

1. In the left sidebar, go to **"Clients"**
2. Click **"Create client"** button (top right)
3. **General Settings**:
   - **Client type**: `OpenID Connect`
   - Click **"Next"**
4. **Capability config**:
   - **Client authentication**: `OFF` (Public client)
   - **Authorization**: `OFF`
   - **Standard flow**: `ON` ✅ (Authorization Code Flow)
   - **Direct access grants**: `ON` ✅ (for password grant testing)
   - **Implicit flow**: `OFF`
   - **Service accounts roles**: `OFF`
   - Click **"Next"**
5. **Login settings**:
   - **Root URL**: `http://localhost:3000`
   - **Home URL**: `http://localhost:3000`
   - **Valid redirect URIs**: 
     ```
     http://localhost:3000/auth/callback
     http://localhost:3000/*
     ```
   - **Valid post logout redirect URIs**: 
     ```
     http://localhost:3000/
     http://localhost:3000/*
     ```
   - **Web origins**: 
     ```
     http://localhost:3000
     ```
   - Click **"Save"**

### Client Settings to Verify

After creation, verify these settings in the client:

1. Go to **Clients** → **streamora-web**
2. **Settings** tab:
   - **Client ID**: `streamora-web`
   - **Client authentication**: `OFF`
   - **Access type**: `public`
   - **Standard flow**: `ON`
   - **Direct access grants**: `ON`
3. **Credentials** tab:
   - Should show "No credentials" (public client)

### Configure Audience Mapper (IMPORTANT)

Keycloak needs to explicitly set the audience claim in tokens. By default, it might not include the client ID as the audience.

1. Go to **Clients** → **streamora-web**
2. Click **"Client scopes"** tab
3. Find **"streamora-web-dedicated"** (or create a dedicated scope)
4. Click on **"streamora-web-dedicated"** scope
5. Go to **"Mappers"** tab
6. Click **"Add mapper"** → **"By configuration"**
7. Select **"Audience"** mapper type
8. Configure:
   - **Name**: `audience-mapper`
   - **Included Client Audience**: `streamora-web` ✅
   - **Add to access token**: `ON` ✅
   - **Add to ID token**: `ON` ✅
9. Click **"Save"**

**Alternative method** (if dedicated scope doesn't exist):

1. Go to **Clients** → **streamora-web**
2. Click **"Client scopes"** tab
3. Click **"Add client scope"** button
4. Select **"streamora-web-dedicated"** (or create new)
5. Follow steps above to add Audience mapper

**Or use default client scope**:

1. Go to **Client scopes** (left sidebar)
2. Click **"Create client scope"**
3. **Name**: `streamora-web-audience`
4. **Protocol**: `openid-connect`
5. Click **"Save"**
6. Go to **"Mappers"** tab
7. Click **"Add mapper"** → **"By configuration"**
8. Select **"Audience"** mapper
9. Configure:
   - **Name**: `audience-mapper`
   - **Included Client Audience**: `streamora-web`
   - **Add to access token**: `ON` ✅
10. Click **"Save"**
11. Go back to **Clients** → **streamora-web** → **Client scopes**
12. Under **"Default client scopes"**, click **"Add client scope"**
13. Select `streamora-web-audience` and set as **Default**

## Step 4: Configure Audience Mapper (CRITICAL)

**This step is essential** - without it, tokens won't have the `aud` claim and API validation will fail.

1. Go to **Clients** → **streamora-web**
2. Click **"Client scopes"** tab
3. Look for **"streamora-web-dedicated"** scope (Keycloak may create this automatically)
   - If it doesn't exist, we'll create a custom scope
4. **Option A - Using Dedicated Scope**:
   - Click on **"streamora-web-dedicated"** scope
   - Go to **"Mappers"** tab
   - Click **"Add mapper"** → **"By configuration"**
   - Select **"Audience"** mapper type
   - Configure:
     - **Name**: `audience-mapper`
     - **Included Client Audience**: `streamora-web` ✅
     - **Add to access token**: `ON` ✅
     - **Add to ID token**: `ON` ✅
   - Click **"Save"**

5. **Option B - Create Custom Scope** (if dedicated scope doesn't work):
   - Go to **Client scopes** (left sidebar)
   - Click **"Create client scope"**
   - **Name**: `streamora-web-audience`
   - **Protocol**: `openid-connect`
   - Click **"Save"**
   - Go to **"Mappers"** tab
   - Click **"Add mapper"** → **"By configuration"**
   - Select **"Audience"**
   - Configure:
     - **Name**: `audience-mapper`
     - **Included Client Audience**: `streamora-web`
     - **Add to access token**: `ON` ✅
   - Click **"Save"**
   - Go back to **Clients** → **streamora-web** → **Client scopes**
   - Under **"Default client scopes"**, click **"Add client scope"**
   - Select `streamora-web-audience` and set as **Default**

**Verify**: After setting this up, test token generation and decode at jwt.io to verify `aud: "streamora-web"` is present.

## Step 5: Configure Client Scopes for Roles

1. Go to **Clients** → **streamora-web**
2. Click **"Client scopes"** tab
3. Under **"Default client scopes"**, ensure these are assigned:
   - `openid` ✅
   - `profile` ✅
   - `email` ✅
   - `roles` ✅ (This is important for role claims)

### Verify Roles Scope Mapper

1. Go to **Client scopes** (left sidebar)
2. Click on **"roles"** scope
3. Go to **"Mappers"** tab
4. Verify there's a mapper called **"realm roles"** or **"User Realm Role"**
5. If missing, click **"Add mapper"** → **"By configuration"**:
   - **Mapper type**: `User Realm Role`
   - **Name**: `realm-roles`
   - **Token claim name**: `realm_access.roles`
   - **Add to access token**: `ON` ✅
   - **Add to ID token**: `ON` ✅
   - Click **"Save"**

## Step 6: Create Realm Roles

1. Go to **"Realm roles"** (left sidebar)
2. Click **"Create role"** button
3. Create each role with these exact names (case-sensitive):

### Role 1: ADMIN
- **Role name**: `ADMIN`
- **Description**: `Platform administrator with full access`
- Click **"Save"**

### Role 2: MODERATOR
- **Role name**: `MODERATOR`
- **Description**: `Content moderator with moderation permissions`
- Click **"Save"**

### Role 3: CREATOR_PENDING
- **Role name**: `CREATOR_PENDING`
- **Description**: `Creator awaiting approval`
- Click **"Save"**

### Role 4: CREATOR_APPROVED
- **Role name**: `CREATOR_APPROVED`
- **Description**: `Approved creator who can publish content`
- Click **"Save"**

### Role 5: VIEWER
- **Role name**: `VIEWER`
- **Description**: `Standard viewer with read-only access`
- Click **"Save"**

**Final roles list should show**:
- ADMIN
- MODERATOR
- CREATOR_PENDING
- CREATOR_APPROVED
- VIEWER

## Step 7: Create Test Users

### User 1: alice (CREATOR_PENDING)

1. Go to **"Users"** (left sidebar)
2. Click **"Create new user"** button
3. **Details**:
   - **Username**: `alice`
   - **Email**: `alice@example.com` (optional)
   - **First name**: `Alice` (optional)
   - **Last name**: `User` (optional)
   - **Email verified**: `ON` (optional)
   - **Enabled**: `ON` ✅
   - Click **"Create"**
4. **Set Password**:
   - Go to **"Credentials"** tab
   - Click **"Set password"**
   - **Password**: `alice`
   - **Password confirmation**: `alice`
   - **Temporary**: `OFF` ✅ (so user doesn't need to change on first login)
   - Click **"Save"**
   - Confirm password set
5. **Assign Role**:
   - Go to **"Role mapping"** tab
   - Click **"Assign role"** button
   - Filter by: `Realm roles`
   - Select: `CREATOR_PENDING`
   - Click **"Assign"**

### User 2: admin1 (ADMIN)

1. Go to **"Users"** (left sidebar)
2. Click **"Create new user"** button
3. **Details**:
   - **Username**: `admin1`
   - **Email**: `admin1@example.com` (optional)
   - **First name**: `Admin` (optional)
   - **Last name**: `User` (optional)
   - **Email verified**: `ON` (optional)
   - **Enabled**: `ON` ✅
   - Click **"Create"**
4. **Set Password**:
   - Go to **"Credentials"** tab
   - Click **"Set password"**
   - **Password**: `admin1`
   - **Password confirmation**: `admin1`
   - **Temporary**: `OFF` ✅
   - Click **"Save"**
   - Confirm password set
5. **Assign Role**:
   - Go to **"Role mapping"** tab
   - Click **"Assign role"** button
   - Filter by: `Realm roles`
   - Select: `ADMIN`
   - Click **"Assign"**

### Optional: Create More Test Users

You can create additional users with different roles:
- `moderator1` with `MODERATOR` role
- `creator1` with `CREATOR_APPROVED` role
- `viewer1` with `VIEWER` role

## Step 8: Verify Token Configuration

### Test Token Generation

1. Go to **Clients** → **streamora-web**
2. Click **"Test"** tab (or use curl)

**Using curl**:
```bash
curl -X POST http://localhost:8080/realms/streamora/protocol/openid-connect/token \
  -d "client_id=streamora-web" \
  -d "username=alice" \
  -d "password=alice" \
  -d "grant_type=password" \
  -d "scope=openid profile email"
```

**Decode the access token** at https://jwt.io and verify:
- `iss`: `http://localhost:8080/realms/streamora`
- `aud`: `streamora-web`
- `realm_access.roles`: Should contain `["CREATOR_PENDING"]`

## Step 9: Configure Token Settings (Optional)

1. Go to **"Realm settings"** (left sidebar)
2. Click **"Tokens"** tab
3. Recommended settings:
   - **Access Token Lifespan**: `5 Minutes` (default)
   - **SSO Session Idle**: `30 Minutes`
   - **SSO Session Max**: `10 Hours`
   - **Access Token Lifespan For Implicit Flow**: `15 Minutes`

## Step 10: Create API Client (Optional - For Future Use)

**Note**: This step is **NOT required** for the current setup. Only create this if you need:
- Service-to-service authentication (client credentials flow)
- API authenticating as itself (not on behalf of users)
- Machine-to-machine communication

If you need this in the future:

1. Go to **"Clients"** (left sidebar)
2. Click **"Create client"** button
3. **General Settings**:
   - **Client type**: `OpenID Connect`
   - Click **"Next"**
4. **Capability config**:
   - **Client authentication**: `ON` ✅ (Confidential client)
   - **Authorization**: `OFF`
   - **Standard flow**: `OFF`
   - **Direct access grants**: `OFF`
   - **Service accounts roles**: `ON` ✅
   - Click **"Next"**
5. **Login settings**:
   - Leave defaults (no redirect URIs needed)
   - Click **"Save"**
6. **Credentials** tab:
   - Copy the **Client secret** (you'll need this for API)
   - Or generate a new one

**For now, skip this step** - we only need `streamora-web` client.

## Step 11: Enable Social Login (Optional - For Later)

If you want to add Google/Facebook login later:

1. Go to **"Identity providers"** (left sidebar)
2. Click **"Add provider"**
3. Select provider (e.g., Google)
4. Configure with client ID and secret
5. Enable in realm settings

## Verification Checklist

After completing all steps, verify:

- [ ] Realm `streamora` created and active
- [ ] Client `streamora-web` created with:
  - [ ] Client authentication: OFF (public)
  - [ ] Standard flow: ON
  - [ ] Direct access grants: ON
  - [ ] Valid redirect URI: `http://localhost:3000/auth/callback`
  - [ ] Web origins: `http://localhost:3000`
- [ ] **Audience mapper configured** (CRITICAL):
  - [ ] Audience mapper added to client scope
  - [ ] Included Client Audience set to `streamora-web`
  - [ ] "Add to access token" enabled
  - [ ] Token includes `aud: "streamora-web"` claim
- [ ] Roles scope mapper configured:
  - [ ] `realm_access.roles` claim added to access token
- [ ] All 5 roles created:
  - [ ] ADMIN
  - [ ] MODERATOR
  - [ ] CREATOR_PENDING
  - [ ] CREATOR_APPROVED
  - [ ] VIEWER
- [ ] Test users created:
  - [ ] `alice` with password `alice`, role `CREATOR_PENDING`
  - [ ] `admin1` with password `admin1`, role `ADMIN`
- [ ] Token test successful:
  - [ ] Can get access token via password grant
  - [ ] Token contains `realm_access.roles` claim
  - [ ] **Token `aud` claim is `streamora-web`** (CRITICAL - verify at jwt.io)
  - [ ] Token `iss` claim is `http://localhost:8080/realms/streamora`

## Troubleshooting

### Token doesn't include roles

1. Check **Client scopes** → **roles** → **Mappers**
2. Verify **"realm roles"** mapper exists
3. Ensure **"Add to access token"** is ON
4. Check user has roles assigned in **Role mapping** tab

### Redirect URI mismatch

1. Go to **Clients** → **streamora-web** → **Settings**
2. Verify **Valid redirect URIs** includes exact callback URL
3. Must match exactly: `http://localhost:3000/auth/callback`

### Can't login with user

1. Check user is **Enabled**
2. Verify password is set (not temporary)
3. Check user has at least one role assigned

### Token validation fails in API

1. **Most common issue**: Token missing `aud` claim
   - Solution: Configure Audience mapper (see Step 4)
   - Verify token has `aud: "streamora-web"` at jwt.io
2. Verify `KEYCLOAK_ISSUER` matches: `http://localhost:8080/realms/streamora`
3. Verify `KEYCLOAK_AUDIENCE` matches: `streamora-web`
4. Check token hasn't expired
5. Decode token at jwt.io to verify all claims

## Quick Reference

### Keycloak URLs

- **Admin Console**: http://localhost:8080
- **Realm**: `streamora`
- **Client ID**: `streamora-web`
- **Token Endpoint**: `http://localhost:8080/realms/streamora/protocol/openid-connect/token`
- **Authorization Endpoint**: `http://localhost:8080/realms/streamora/protocol/openid-connect/auth`
- **JWKS Endpoint**: `http://localhost:8080/realms/streamora/protocol/openid-connect/certs`

### Test Credentials

- **Admin Console**: `admin` / `admin`
- **Test User (Creator)**: `alice` / `alice` (role: CREATOR_PENDING)
- **Test User (Admin)**: `admin1` / `admin1` (role: ADMIN)

## Next Steps

Once Keycloak is configured:

1. ✅ Verify token generation works
2. ✅ Test login flow in web app
3. ✅ Verify API can validate tokens
4. ✅ Test role-based access control

See `docs/day2-completion.md` for testing the complete flow.
