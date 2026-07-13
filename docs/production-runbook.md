# Streamora — Production Runbook

Operational guide for staging and production deployments.

## Services

| Service | Cloud Run name | Purpose |
|---------|----------------|---------|
| Web | `streamora-web-{env}` | Next.js SSR + Clerk auth |
| API | `streamora-api-{env}` | NestJS REST API |
| Worker | `streamora-worker-{env}` | FFmpeg processing (Pub/Sub) |

## Deploy

```bash
# Manual deploy via GitHub Actions
gh workflow run deploy.yml -f environment=staging

# Or locally after building images:
IMAGE_TAG=latest ENV=staging ./infra/scripts/deploy-staging.sh
```

### Rollback

```bash
gcloud run services update-traffic streamora-api-prod \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region=us-central1
```

Repeat for `streamora-web-prod` and `streamora-worker-prod`.

## Database migrations

```bash
DATABASE_URL="postgresql://..." pnpm --filter api exec prisma migrate deploy
```

Always run migrations **before** switching traffic to a new API revision.

## Scheduled publishing

Production uses **Cloud Scheduler**, not in-process cron.

```bash
gcloud scheduler jobs create http streamora-publish-due \
  --schedule="*/5 * * * *" \
  --uri="https://api.streamora.app/admin/scheduler/publish-due" \
  --http-method=POST \
  --headers="x-scheduler-secret=YOUR_SECRET" \
  --location=us-central1
```

Set `ENABLE_INTERNAL_CRON=false` on the API in production.

## Approve a stakeholder

1. User signs in via Clerk (invited with `CREATOR_PENDING` in `publicMetadata.roles`)
2. User calls `GET /me` automatically on sign-in (provisions DB user)
3. Admin opens moderation/admin tools
4. `POST /admin/users/:id/creator-approve`:
   - Sets `CreatorProfile.approval = APPROVED`
   - Updates Clerk role to `CREATOR_APPROVED`
   - Sets `uploaderVisible = true` on their videos

See [stakeholder-onboarding.md](./stakeholder-onboarding.md) for the full flow.

## Reprocess a failed video

1. Creator dashboard → My Videos → **Start processing** (for DRAFT/UPLOADED/PROCESSING_FAILED)
2. Or API: `POST /creator/videos/:id/reprocess`
3. Check admin Jobs page for worker failures

## Emergency takedown

1. Admin → Moderation → select published video
2. Use governance takedown (`POST /admin/videos/:id/takedown`)
3. Video status becomes `TAKEDOWN`; removed from public listings

## Monitoring and alerts

Recommended Cloud Monitoring alerts:

| Alert | Condition |
|-------|-----------|
| API 5xx rate | > 1% over 5 min |
| Cloud Run instance count | API = 0 for > 2 min |
| Pub/Sub oldest unacked message | > 10 min |
| Cloud SQL disk | > 80% |
| Worker restarts | > 3 in 15 min |

Logs: Cloud Logging → filter `resource.type="cloud_run_revision"` + `jsonPayload.requestId`.

Uptime checks:

- `GET https://streamora.app/en` → 200
- `GET https://api.streamora.app/health` → `{"status":"ok"}`

## Secrets rotation

| Secret | Where | Rotation |
|--------|-------|----------|
| `CLERK_SECRET_KEY` | Secret Manager | Clerk dashboard → roll key → update secret → redeploy |
| `DATABASE_URL` | Secret Manager | Cloud SQL password rotate → update secret |
| `SCHEDULER_SECRET` | Secret Manager + Cloud Scheduler header | Generate new → update both |

## Support contact

Set `NEXT_PUBLIC_CONTACT_EMAIL` on the web service for the landing page contact CTA.
