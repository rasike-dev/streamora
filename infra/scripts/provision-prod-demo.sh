#!/usr/bin/env bash
# Provision cheapest-tier GCP resources for a production demo on slpolinet-prod.
# Usage: ./infra/scripts/provision-prod-demo.sh
#
# Cost notes (approximate):
#   - Cloud SQL db-f1-micro: smallest shared instance (~$7/mo; may qualify for free trial credits)
#   - Cloud Run: scale-to-zero (no min instances) except optional worker
#   - Skips VPC connector — Cloud Run uses native Cloud SQL socket (--add-cloudsql-instances)
#   - Pub/Sub + GCS: pay-per-use; demo traffic is negligible
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-slpolinet-prod}"
REGION="${REGION:-us-central1}"
ENV_LABEL="${ENV_LABEL:-prod}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "Provisioning demo ${ENV_LABEL} in ${PROJECT_ID} (${REGION})..."

gcloud config set project "$PROJECT_ID"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
UPLOADER_SA="slpolinet-uploader@${PROJECT_ID}.iam.gserviceaccount.com"
INSTANCE="streamora-${ENV_LABEL}"
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE}"

echo "=== Enable APIs ==="
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  pubsub.googleapis.com \
  cloudscheduler.googleapis.com \
  iamcredentials.googleapis.com \
  --project="$PROJECT_ID"

echo "=== Artifact Registry (Docker) ==="
gcloud artifacts repositories describe streamora \
  --location="$REGION" \
  --project="$PROJECT_ID" 2>/dev/null || \
gcloud artifacts repositories create streamora \
  --repository-format=docker \
  --location="$REGION" \
  --description="SLPoliNet container images" \
  --project="$PROJECT_ID"

echo "=== Cloud SQL (db-f1-micro — cheapest tier) ==="
if ! gcloud sql instances describe "$INSTANCE" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud sql instances create "$INSTANCE" \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region="$REGION" \
    --storage-size=10GB \
    --storage-auto-increase \
    --no-deletion-protection \
    --project="$PROJECT_ID"
  echo "Waiting for Cloud SQL instance to be RUNNABLE..."
  for _ in $(seq 1 40); do
    state="$(gcloud sql instances describe "$INSTANCE" --project="$PROJECT_ID" --format='value(state)')"
    [[ "$state" == "RUNNABLE" ]] && break
    sleep 15
  done
fi

gcloud sql databases describe streamora --instance="$INSTANCE" --project="$PROJECT_ID" 2>/dev/null || \
gcloud sql databases create streamora --instance="$INSTANCE" --project="$PROJECT_ID"

DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)}"
if ! gcloud sql users list --instance="$INSTANCE" --project="$PROJECT_ID" --format='value(name)' | grep -qx streamora; then
  gcloud sql users create streamora \
    --instance="$INSTANCE" \
    --password="$DB_PASSWORD" \
    --project="$PROJECT_ID"
else
  gcloud sql users set-password streamora \
    --instance="$INSTANCE" \
    --password="$DB_PASSWORD" \
    --project="$PROJECT_ID"
fi

DATABASE_URL="postgresql://streamora:${DB_PASSWORD}@/streamora?host=/cloudsql/${CONNECTION_NAME}"

echo "=== GCS buckets (slpolinet-*-prod) ==="
for BUCKET in slpolinet-originals-prod slpolinet-thumbs-prod slpolinet-renditions-prod; do
  gsutil ls -b "gs://${BUCKET}" >/dev/null 2>&1 || gsutil mb -l "$REGION" -p "$PROJECT_ID" "gs://${BUCKET}"
done
gsutil cors set "${REPO_ROOT}/infra/gcs-cors.json" "gs://slpolinet-renditions-prod" 2>/dev/null || true

echo "=== Pub/Sub ==="
for TOPIC in video.uploaded media.uploaded; do
  gcloud pubsub topics describe "$TOPIC" --project="$PROJECT_ID" >/dev/null 2>&1 || \
  gcloud pubsub topics create "$TOPIC" --project="$PROJECT_ID"
done
gcloud pubsub subscriptions describe video-uploaded-prod-sub --project="$PROJECT_ID" >/dev/null 2>&1 || \
gcloud pubsub subscriptions create video-uploaded-prod-sub \
  --topic=video.uploaded \
  --ack-deadline=600 \
  --project="$PROJECT_ID"
gcloud pubsub subscriptions describe media-uploaded-prod-sub --project="$PROJECT_ID" >/dev/null 2>&1 || \
gcloud pubsub subscriptions create media-uploaded-prod-sub \
  --topic=media.uploaded \
  --ack-deadline=600 \
  --project="$PROJECT_ID"

echo "=== Secret Manager ==="
upsert_secret() {
  local name="$1"
  local value="$2"
  if gcloud secrets describe "$name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- --project="$PROJECT_ID"
  else
    printf '%s' "$value" | gcloud secrets create "$name" --data-file=- --project="$PROJECT_ID"
  fi
}

SCHEDULER_SECRET="${SCHEDULER_SECRET:-$(openssl rand -base64 32)}"
upsert_secret "streamora-database-url-${ENV_LABEL}" "$DATABASE_URL"
upsert_secret "streamora-scheduler-secret-${ENV_LABEL}" "$SCHEDULER_SECRET"

if [[ -f "${REPO_ROOT}/apps/web/.env.local" ]]; then
  CLERK_SECRET="$(grep '^CLERK_SECRET_KEY=' "${REPO_ROOT}/apps/web/.env.local" | cut -d= -f2- || true)"
  if [[ -n "$CLERK_SECRET" ]]; then
    upsert_secret "streamora-clerk-secret-${ENV_LABEL}" "$CLERK_SECRET"
  fi
fi

echo "=== IAM (Cloud Run + uploader SA) ==="
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUN_SA}" \
  --role="roles/cloudsql.client" --quiet >/dev/null 2>&1 || true
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUN_SA}" \
  --role="roles/secretmanager.secretAccessor" --quiet >/dev/null 2>&1 || true

for SUB in video-uploaded-prod-sub media-uploaded-prod-sub; do
  gcloud pubsub subscriptions add-iam-policy-binding "$SUB" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:${UPLOADER_SA}" \
    --role="roles/pubsub.subscriber" --quiet 2>/dev/null || true
  gcloud pubsub subscriptions add-iam-policy-binding "$SUB" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:${RUN_SA}" \
    --role="roles/pubsub.subscriber" --quiet 2>/dev/null || true
done
for BUCKET in slpolinet-originals-prod slpolinet-thumbs-prod slpolinet-renditions-prod; do
  gsutil iam ch "serviceAccount:${UPLOADER_SA}:objectAdmin" "gs://${BUCKET}" 2>/dev/null || true
  gsutil iam ch "serviceAccount:${RUN_SA}:objectAdmin" "gs://${BUCKET}" 2>/dev/null || true
done

echo ""
echo "Done. Demo ${ENV_LABEL} infrastructure is ready."
echo ""
echo "Cloud SQL instance: ${INSTANCE}"
echo "Connection name:    ${CONNECTION_NAME}"
echo "Secrets created:    streamora-database-url-${ENV_LABEL}, streamora-scheduler-secret-${ENV_LABEL}"
echo "                    streamora-clerk-secret-${ENV_LABEL} (if apps/web/.env.local had CLERK_SECRET_KEY)"
echo ""
echo "Next:"
echo "  1. Set GitHub secrets/vars (GCP_WIF_PROVIDER, GCP_DEPLOY_SA, DATABASE_URL for CI migrations)"
echo "  2. gh workflow run deploy.yml -f environment=prod"
echo "  3. Or locally: IMAGE_TAG=latest ENV=prod ./infra/scripts/deploy-staging.sh"
echo "  4. Migrate: DATABASE_URL=<from Secret Manager> pnpm --filter api exec prisma migrate deploy"
echo "  5. Seed:    DATABASE_URL=... pnpm --filter api exec prisma db seed"
