# Clerk Setup for Streamora

Streamora uses [Clerk](https://clerk.com) for stakeholder authentication.

## Quick start with the Clerk agent (recommended)

This repo includes official Clerk agent tooling:

| Tool | Location | Purpose |
|------|----------|---------|
| **Clerk MCP** | [`.cursor/mcp.json`](../.cursor/mcp.json) | SDK snippets and patterns in Cursor |
| **Clerk skills** | [`.agents/skills/`](../.agents/skills/) | Setup, Next.js patterns, CLI, webhooks |
| **Clerk CLI** | `npx clerk@latest` | Login, link app, pull env vars, create JWT templates |

### 1. Enable Clerk MCP in Cursor

The project already includes [`.cursor/mcp.json`](../.cursor/mcp.json). If Clerk MCP is not active:

1. Open **Cursor Settings → Tools & MCP**
2. Confirm `clerk` shows a green active status pointing to `https://mcp.clerk.com/mcp`
3. Or paste this into your global MCP config:

```json
{
  "mcpServers": {
    "clerk": {
      "url": "https://mcp.clerk.com/mcp"
    }
  }
}
```

Once connected, ask the agent things like:
- "Show me how to protect Next.js routes with Clerk"
- "Create a JWT template for streamora-api with roles from publicMetadata"

### 2. Provision keys with Clerk CLI

Run these in your **host terminal** (not sandboxed):

```bash
# Option A — new Clerk app + auto env vars
cd apps/web
npx clerk@latest init --framework next --keyless -y

# Option B — link existing Clerk app
npx clerk@latest auth login
npx clerk@latest link          # or: clerk link --app app_xxx
npx clerk@latest env pull
```

Copy pulled keys to the API root `.env` as well:

```bash
# From apps/web/.env.local → root .env
CLERK_SECRET_KEY=sk_test_...
CLERK_JWKS_URL=https://<instance>.clerk.accounts.dev/.well-known/jwks.json
CLERK_JWT_ISSUER=https://<instance>.clerk.accounts.dev
CLERK_JWT_AUDIENCE=streamora-api
```

Verify integration health:

```bash
npx clerk@latest doctor
```

### 3. Create JWT template via CLI (optional)

Instead of the Dashboard, agents can create the API template:

```bash
npx clerk@latest api jwt_templates -d '{
  "name": "streamora-api",
  "claims": {
    "roles": "{{user.public_metadata.roles}}"
  },
  "lifetime": 3600
}'
```

---

## Manual dashboard setup

Follow these steps in the [Clerk Dashboard](https://dashboard.clerk.com) if you prefer the UI over CLI.


1. Sign up at [clerk.com](https://clerk.com) and create an application named **Streamora**.
2. Create separate **Development** and **Production** instances (Clerk does this automatically).

## 2. Sign-in methods

Enable:

- **Email** (password or magic link)
- **Google** (recommended for stakeholders)

## 3. Restrict sign-up (invite-only)

Stakeholders should not self-register without approval:

1. Go to **User & Authentication → Restrictions**
2. Enable **Allowlist** or disable public sign-up
3. Invite stakeholders via **Users → Invite user**
4. New users receive `CREATOR_PENDING` role via default metadata (step 5)

## 4. Role metadata

Roles are stored in `publicMetadata.roles` as a string array.

| Role | Who | Capabilities |
|------|-----|--------------|
| `VIEWER` | Default signed-in user | Browse, watch |
| `CREATOR_PENDING` | Invited stakeholder (awaiting approval) | Upload (limited), submit for review |
| `CREATOR_APPROVED` | Approved stakeholder | Full upload limits |
| `MODERATOR` | Editorial staff | Moderation queue |
| `ADMIN` | Platform operator | Full admin access |

### Default role for new users

**User & Authentication → Email, Phone, Username → User metadata**

Set default public metadata for new sign-ups:

```json
{
  "roles": ["CREATOR_PENDING"]
}
```

### Admin / moderator accounts

In Clerk Dashboard → **Users** → select user → **Public metadata**:

```json
{
  "roles": ["ADMIN"]
}
```

## 5. JWT template for API

The API validates Bearer tokens from a Clerk JWT template.

1. Go to **JWT Templates → New template**
2. Name: `streamora-api`
3. Claims:

```json
{
  "roles": "{{user.public_metadata.roles}}"
}
```

4. Note the **Issuer** and **JWKS endpoint** (shown on the template page)
5. Set **Audience** if required (match `CLERK_JWT_AUDIENCE` in API `.env`)

## 6. Environment variables

### Environment variables — which file?

| Variable | File | Used by |
|----------|------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `apps/web/.env.local` | Next.js (browser) |
| `CLERK_SECRET_KEY` | `apps/web/.env.local` **and** root `.env` | Next.js server + NestJS API |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` etc. | `apps/web/.env.local` | Next.js routing |
| `CLERK_JWT_ISSUER` | **root `.env` only** | NestJS API (`jwt.guard.ts`) |
| `CLERK_JWKS_URL` | **root `.env` only** | NestJS API (validates Bearer tokens) |
| `CLERK_JWT_AUDIENCE` | **root `.env` only** | Must match JWT template name (`streamora-api`) |

`clerk env pull` writes **web** keys to `apps/web/.env.local`. It does **not** automatically add `CLERK_JWT_ISSUER` / `CLERK_JWKS_URL` — you add those to the **API** `.env` manually.

**Derive issuer from your publishable key:** the domain is embedded in `pk_test_...`. For your instance:

```bash
# Your Clerk instance (from pk_test key decode)
CLERK_JWT_ISSUER=https://simple-mackerel-36.clerk.accounts.dev
CLERK_JWKS_URL=https://simple-mackerel-36.clerk.accounts.dev/.well-known/jwks.json
```

Or find the exact issuer on **Clerk Dashboard → JWT Templates → streamora-api**.

### API (root `.env`)

```bash
CLERK_JWKS_URL=https://simple-mackerel-36.clerk.accounts.dev/.well-known/jwks.json
CLERK_JWT_ISSUER=https://simple-mackerel-36.clerk.accounts.dev
CLERK_JWT_AUDIENCE=streamora-api
CLERK_SECRET_KEY=sk_test_...   # same secret as web
SCHEDULER_SECRET=generate-a-long-random-string
```

### Web (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/en/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/en/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/en/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/en/dashboard
```

Sign-in routes: `/en/sign-in`, `/si/sign-in`, `/ta/sign-in` (Clerk catch-all under `[locale]/sign-in`).

## 7. Production URLs

In Clerk Dashboard → **Paths / Domains**:

| Setting | Development | Production |
|---------|-------------|------------|
| Home URL | `http://localhost:3000` | `https://streamora.app` |
| Sign-in URL | `/en/sign-in` | `/en/sign-in` |
| Allowed redirect URLs | `http://localhost:3000/*` | `https://streamora.app/*` |

## 8. Creator approval flow

When an admin approves a creator in Streamora (`POST /admin/users/:id/creator-approve`):

1. `CreatorProfile.approval` → `APPROVED` in Postgres
2. Clerk `publicMetadata.roles` → `CREATOR_APPROVED` (automatic via API)
3. Upload limits increase from pending (250 MB) to approved (2 GB)

No manual Clerk Dashboard edits needed after approval.

## 9. MFA for admins (recommended)

**User & Authentication → Multi-factor**

Require MFA for users with `ADMIN` or `MODERATOR` roles (enforce via Clerk organization policies or manual enrollment).

## 10. Local development

1. Copy env vars from sections 6 into `.env` and `apps/web/.env.local`
2. Start Postgres + Redis: `docker compose up -d`
3. Run migrations: `pnpm --filter api exec dotenv -e ../../.env -- prisma migrate deploy`
4. Start apps: `pnpm dev`
5. Sign in at `http://localhost:3000/en/sign-in`

Keycloak is no longer required locally.
