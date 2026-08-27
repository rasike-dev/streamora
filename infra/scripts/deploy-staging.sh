#!/usr/bin/env bash
# Deploy SLPoliNet to Cloud Run (staging or production).
# Requires: images built and pushed to Artifact Registry.
# Usage: PROJECT_ID=... REGION=us-central1 ENV=prod IMAGE_TAG=latest ./infra/scripts/deploy-staging.sh
#
# Demo/cheap defaults (DEMO_CHEAP=true):
#   - scale-to-zero for web + API (cold starts OK for demos)
#   - worker: 512Mi / 1 CPU (override with WORKER_MIN_INSTANCES=1 if you need always-on processing)
#   - native Cloud SQL socket (no VPC connector billing)
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-slpolinet-prod}"
REGION="${REGION:-us-central1}"
ENV="${ENV:-staging}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DEMO_CHEAP="${DEMO_CHEAP:-true}"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/streamora"
INSTANCE="streamora-${ENV}"
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE}"

gcloud config set project "$PROJECT_ID"

API_MIN="${API_MIN_INSTANCES:-0}"
WEB_MIN="${WEB_MIN_INSTANCES:-0}"
WORKER_MIN="${WORKER_MIN_INSTANCES:-0}"
if [[ "$DEMO_CHEAP" != "true" ]]; then
  API_MIN="${API_MIN_INSTANCES:-1}"
  WORKER_MIN="${WORKER_MIN_INSTANCES:-1}"
fi

BUCKET_PREFIX="streamora"
[[ "$ENV" == "prod" ]] && BUCKET_PREFIX="slpolinet"

COMMON_API_ENV="NODE_ENV=production,ENABLE_INTERNAL_CRON=false,GCP_PROJECT_ID=${PROJECT_ID}"
COMMON_API_ENV+=",GCS_BUCKET_ORIGINALS=${BUCKET_PREFIX}-originals-${ENV}"
COMMON_API_ENV+=",GCS_BUCKET_THUMBS=${BUCKET_PREFIX}-thumbs-${ENV}"
COMMON_API_ENV+=",GCS_BUCKET_RENDITIONS=${BUCKET_PREFIX}-renditions-${ENV}"
COMMON_API_ENV+=",MEDIA_BUCKET=${BUCKET_PREFIX}-renditions-${ENV}"
COMMON_API_ENV+=",PUBSUB_TOPIC_VIDEO_UPLOADED=video.uploaded"
COMMON_API_ENV+=",PUBSUB_TOPIC_MEDIA_UPLOADED=media.uploaded"
COMMON_API_ENV+=",CLERK_JWT_AUDIENCE=streamora-api"

# Demo: use dev Clerk issuer until production Clerk is configured
CLERK_ISSUER="${CLERK_JWT_ISSUER:-https://clerk.slpolinet.com}"
[[ "$ENV" != "prod" ]] && CLERK_ISSUER="${CLERK_JWT_ISSUER:-https://in-hippo-5893.clerk.accounts.dev}"
COMMON_API_ENV+=",CLERK_JWT_ISSUER=${CLERK_ISSUER}"
COMMON_API_ENV+=",CLERK_JWKS_URL=${CLERK_ISSUER%/}/.well-known/jwks.json"

ALLOWED="${ALLOWED_ORIGINS:-https://slpolinet.com}"
[[ "$ENV" != "prod" ]] && ALLOWED="${ALLOWED_ORIGINS:-http://localhost:3000}"
UPLOAD_ORIGIN="${UPLOAD_RESUMABLE_ORIGIN:-https://slpolinet.com}"
COMMON_API_ENV+=",ALLOWED_ORIGINS=${ALLOWED}"
COMMON_API_ENV+=",UPLOAD_RESUMABLE_ORIGIN=${UPLOAD_ORIGIN}"

WORKER_ENV="NODE_ENV=production,GCP_PROJECT_ID=${PROJECT_ID}"
WORKER_ENV+=",PUBSUB_SUBSCRIPTION_VIDEO_UPLOADED=video-uploaded-${ENV}-sub"
WORKER_ENV+=",PUBSUB_SUBSCRIPTION_MEDIA_UPLOADED=media-uploaded-${ENV}-sub"
WORKER_ENV+=",GCS_BUCKET_THUMBS=${BUCKET_PREFIX}-thumbs-${ENV}"
WORKER_ENV+=",GCS_BUCKET_RENDITIONS=${BUCKET_PREFIX}-renditions-${ENV}"
WORKER_ENV+=",MEDIA_BUCKET=${BUCKET_PREFIX}-renditions-${ENV}"

SQL_FLAG=(--add-cloudsql-instances="$CONNECTION_NAME")

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
    "${SQL_FLAG[@]}" \
    --set-secrets="DATABASE_URL=streamora-database-url-${ENV}:latest,CLERK_SECRET_KEY=streamora-clerk-secret-${ENV}:latest,SCHEDULER_SECRET=streamora-scheduler-secret-${ENV}:latest" \
    --set-env-vars="$COMMON_API_ENV" \
    "$@" \
    --project="$PROJECT_ID"
}

deploy_service "streamora-api-${ENV}" "${REGISTRY}/api:${IMAGE_TAG}" 3001 \
  --min-instances="$API_MIN" \
  --max-instances=3 \
  --memory=512Mi \
  --cpu=1

deploy_service "streamora-web-${ENV}" "${REGISTRY}/web:${IMAGE_TAG}" 3000 \
  --min-instances="$WEB_MIN" \
  --max-instances=3 \
  --memory=512Mi \
  --cpu=1

WORKER_MEM="512Mi"
WORKER_CPU="1"
[[ "$DEMO_CHEAP" != "true" ]] && WORKER_MEM="2Gi" && WORKER_CPU="2"

gcloud run deploy "streamora-worker-${ENV}" \
  --image="${REGISTRY}/worker:${IMAGE_TAG}" \
  --region="$REGION" \
  --platform=managed \
  --no-allow-unauthenticated \
  --port=8080 \
  --min-instances="$WORKER_MIN" \
  --max-instances=2 \
  --memory="$WORKER_MEM" \
  --cpu="$WORKER_CPU" \
  --timeout=3600 \
  "${SQL_FLAG[@]}" \
  --set-secrets="DATABASE_URL=streamora-database-url-${ENV}:latest" \
  --set-env-vars="$WORKER_ENV" \
  --project="$PROJECT_ID"

echo ""
echo "Deploy complete (${ENV}, DEMO_CHEAP=${DEMO_CHEAP})."
echo "  API min instances:    ${API_MIN}"
echo "  Worker min instances: ${WORKER_MIN} (set WORKER_MIN_INSTANCES=1 for always-on video processing)"
echo ""
echo "Run migrations:"
echo "  gcloud secrets versions access latest --secret=streamora-database-url-${ENV} --project=${PROJECT_ID} | xargs -I{} env DATABASE_URL={} pnpm --filter api exec prisma migrate deploy"
