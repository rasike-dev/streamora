#!/usr/bin/env bash
# Deploy Streamora to Cloud Run (staging or production).
# Requires: images built and pushed to Artifact Registry.
# Usage: PROJECT_ID=... REGION=us-central1 ENV=staging IMAGE_TAG=latest ./infra/scripts/deploy-staging.sh
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-streamora-487815}"
REGION="${REGION:-us-central1}"
ENV="${ENV:-staging}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/streamora"
CONNECTOR="streamora-${ENV}"

gcloud config set project "$PROJECT_ID"

deploy_service() {
  local NAME="$1"
  local IMAGE="$2"
  local PORT="$3"
  shift 3
  gcloud run deploy "$NAME" \
    --image="$IMAGE" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --port="$PORT" \
    --vpc-connector="$CONNECTOR" \
    --set-secrets="DATABASE_URL=streamora-database-url-${ENV}:latest,CLERK_SECRET_KEY=streamora-clerk-secret-${ENV}:latest,SCHEDULER_SECRET=streamora-scheduler-secret-${ENV}:latest" \
    --set-env-vars="NODE_ENV=production,ENABLE_INTERNAL_CRON=false" \
    "$@" \
    --project="$PROJECT_ID"
}

deploy_service "streamora-api-${ENV}" "${REGISTRY}/api:${IMAGE_TAG}" 3001 \
  --min-instances=1 \
  --memory=512Mi

deploy_service "streamora-web-${ENV}" "${REGISTRY}/web:${IMAGE_TAG}" 3000 \
  --min-instances=0 \
  --memory=512Mi

# Worker runs as a long-lived Cloud Run service (Pub/Sub pull subscriber)
gcloud run deploy "streamora-worker-${ENV}" \
  --image="${REGISTRY}/worker:${IMAGE_TAG}" \
  --region="$REGION" \
  --platform=managed \
  --no-allow-unauthenticated \
  --min-instances=1 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=3600 \
  --vpc-connector="$CONNECTOR" \
  --set-secrets="DATABASE_URL=streamora-database-url-${ENV}:latest" \
  --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=${PROJECT_ID},PUBSUB_SUBSCRIPTION_VIDEO_UPLOADED=video-uploaded-${ENV}-sub" \
  --project="$PROJECT_ID"

echo "Deploy complete. Run migrations:"
echo "  pnpm --filter api exec prisma migrate deploy"
