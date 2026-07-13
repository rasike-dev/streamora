# Stakeholder Onboarding

How to onboard a new content stakeholder on Streamora.

## Overview

```
Invite in Clerk → Sign in → Upload → Submit → Admin approve → Publish → Share
```

## Step 1 — Invite in Clerk

1. Open [Clerk Dashboard](https://dashboard.clerk.com) → **Users → Invite**
2. Enter stakeholder email
3. Ensure default public metadata includes:
   ```json
   { "roles": ["CREATOR_PENDING"] }
   ```
4. Send invitation

## Step 2 — Stakeholder signs in

1. Stakeholder opens `https://streamora.app/en/sign-in`
2. Completes Clerk sign-in (email or Google)
3. App calls `GET /me` → creates `User` + `CreatorProfile` in Postgres
4. Redirected to dashboard

## Step 3 — Upload and edit

1. **Upload** at `/en/upload` (requires sign-in; pending creators have 250 MB / 5 uploads per day limits)
2. Wait for processing → status **READY**
3. Edit metadata (title, description in en/si/ta), thumbnails, visibility
4. **Submit for moderation**

## Step 4 — Admin approves creator (first time)

If the stakeholder is new, admin should approve their creator account:

1. Admin signs in (role `ADMIN` or `MODERATOR` in Clerk metadata)
2. Approve via API or admin user management:
   `POST /admin/users/:internalUserId/creator-approve`
3. This automatically:
   - Sets DB `CreatorProfile.approval = APPROVED`
   - Promotes Clerk role to `CREATOR_APPROVED`
   - Increases upload limits

## Step 5 — Admin moderates video

1. Open `/en/admin/moderation`
2. Review pending video
3. **Approve** → status `APPROVED`
4. **Publish** → status `PUBLISHED`

## Step 6 — Share

Public URL: `https://streamora.app/en/v/{slug}`

Share on WhatsApp, Facebook, X, LinkedIn — OG preview uses selected thumbnail.

## Role reference

| Clerk `publicMetadata.roles` | Meaning |
|------------------------------|---------|
| `CREATOR_PENDING` | Invited, limited uploads, awaiting account approval |
| `CREATOR_APPROVED` | Full creator limits |
| `MODERATOR` | Moderation queue access |
| `ADMIN` | Full platform admin |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 401 on API calls | Check Clerk JWT template `streamora-api` includes `roles` claim |
| User not in DB | Ensure `/me` was called after sign-in (automatic via AuthSync) |
| Upload limit | Pending creators: 5/day, 250 MB. Approve creator to increase. |
| Video stuck PROCESSING_FAILED | Use **Start processing** or `POST /creator/videos/:id/reprocess` |
