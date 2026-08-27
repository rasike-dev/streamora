#!/usr/bin/env bash
# Map custom domains to Cloud Run (SLPoliNet production).
#
# Prerequisites:
#   1. Domain verified in GCP (one-time, per account):
#        gcloud domains verify slpolinet.com
#      Complete the Search Console flow in the browser, then re-run this script.
#
# Usage:
#   DOMAIN=slpolinet.com ENV=prod ./infra/scripts/setup-domain.sh
#   DOMAIN=slpolinet.com ENV=prod APPLY_ENV=true REBUILD_WEB=true ./infra/scripts/setup-domain.sh
#
# Optional flags (env vars):
#   APPLY_ENV=true   — patch Cloud Run env vars (API CORS, upload origin)
#   REBUILD_WEB=true — rebuild/push/deploy web with custom-domain NEXT_PUBLIC_* URLs
#   IMAGE_TAG=local-demo1
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-slpolinet-prod}"
REGION="${REGION:-us-central1}"
DOMAIN="${DOMAIN:-slpolinet.com}"
ENV="${ENV:-prod}"
IMAGE_TAG="${IMAGE_TAG:-local-demo1}"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/streamora"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APPLY_ENV="${APPLY_ENV:-false}"
REBUILD_WEB="${REBUILD_WEB:-false}"

WEB_SERVICE="streamora-web-${ENV}"
API_SERVICE="streamora-api-${ENV}"
WEB_ORIGIN="https://${DOMAIN}"
WWW_ORIGIN="https://www.${DOMAIN}"
API_ORIGIN="https://api.${DOMAIN}"

gcloud config set project "$PROJECT_ID" >/dev/null

echo "=== Domain mapping: ${DOMAIN} (${ENV}) ==="
echo ""

VERIFIED="$(gcloud domains list-user-verified --project="$PROJECT_ID" --format='value(id)' 2>/dev/null | grep -F "${DOMAIN}" || true)"
if [[ -z "$VERIFIED" ]]; then
  echo "Domain ${DOMAIN} is not verified for this Google account yet."
  echo ""
  echo "Run (opens Search Console in your browser):"
  echo "  gcloud domains verify ${DOMAIN} --project=${PROJECT_ID}"
  echo ""
  echo "Verify ownership (TXT record or HTML file at your registrar), then re-run:"
  echo "  DOMAIN=${DOMAIN} ENV=${ENV} ./infra/scripts/setup-domain.sh"
  exit 1
fi

echo "Verified domain: ${DOMAIN}"
echo ""

create_mapping() {
  local service="$1"
  local host="$2"
  if gcloud beta run domain-mappings describe --domain="$host" --region="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "  exists: ${host} -> ${service}"
  else
    echo "  creating: ${host} -> ${service}"
    gcloud beta run domain-mappings create \
      --service="$service" \
      --domain="$host" \
      --region="$REGION" \
      --project="$PROJECT_ID"
  fi
}

echo "=== Cloud Run domain mappings ==="
create_mapping "$WEB_SERVICE" "$DOMAIN"
create_mapping "$WEB_SERVICE" "www.${DOMAIN}"
create_mapping "$API_SERVICE" "api.${DOMAIN}"
echo ""

echo "=== DNS records (add at your domain registrar) ==="
for HOST in "$DOMAIN" "www.${DOMAIN}" "api.${DOMAIN}"; do
  echo ""
  echo "--- ${HOST} ---"
  gcloud beta run domain-mappings describe \
    --domain="$HOST" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format='yaml(status.resourceRecords)' 2>/dev/null || true
done
echo ""
echo "Tip: apex (${DOMAIN}) usually needs A/AAAA records; subdomains use CNAME."
echo "DNS can take 15–60 minutes to propagate."
echo ""

if [[ "$APPLY_ENV" == "true" ]]; then
  echo "=== Updating Cloud Run env vars ==="
  gcloud run services update "$API_SERVICE" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --update-env-vars="^@@^ALLOWED_ORIGINS=${WEB_ORIGIN},${WWW_ORIGIN},https://streamora-web-prod-834964503665.us-central1.run.app@@UPLOAD_RESUMABLE_ORIGIN=${WEB_ORIGIN}"
  echo "  API: ALLOWED_ORIGINS + UPLOAD_RESUMABLE_ORIGIN updated"
  echo ""
fi

if [[ "$REBUILD_WEB" == "true" ]]; then
  echo "=== Rebuilding web with custom domain URLs ==="
  CLERK_PK="${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}"
  if [[ -z "$CLERK_PK" && -f "${REPO_ROOT}/apps/web/.env.local" ]]; then
    CLERK_PK="$(grep '^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=' "${REPO_ROOT}/apps/web/.env.local" | cut -d= -f2-)"
  fi
  if [[ -z "$CLERK_PK" ]]; then
    echo "Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY or ensure apps/web/.env.local exists."
    exit 1
  fi
  docker build -f "${REPO_ROOT}/apps/web/Dockerfile" \
    --build-arg "NEXT_PUBLIC_API_URL=${API_ORIGIN}" \
    --build-arg "NEXT_PUBLIC_APP_URL=${WEB_ORIGIN}" \
    --build-arg "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${CLERK_PK}" \
    -t "${REGISTRY}/web:${IMAGE_TAG}" \
    "${REPO_ROOT}"
  docker push "${REGISTRY}/web:${IMAGE_TAG}"
  gcloud run deploy "$WEB_SERVICE" \
    --image="${REGISTRY}/web:${IMAGE_TAG}" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --port=3000 \
    --min-instances=0 \
    --max-instances=3 \
    --memory=512Mi \
    --cpu=1 \
    --set-secrets="CLERK_SECRET_KEY=streamora-clerk-secret-${ENV}:latest" \
    --project="$PROJECT_ID"
  echo "  Web redeployed with NEXT_PUBLIC_APP_URL=${WEB_ORIGIN}"
  echo ""
fi

echo "=== GCS CORS (renditions bucket) ==="
gsutil cors set "${REPO_ROOT}/infra/gcs-cors.json" "gs://slpolinet-renditions-${ENV}" 2>/dev/null || \
  gsutil cors set "${REPO_ROOT}/infra/gcs-cors.json" "gs://slpolinet-renditions-prod"
echo "  Applied infra/gcs-cors.json"
echo ""

echo "=== Clerk dashboard (manual) ==="
echo "  Allowed origins / redirect URLs:"
echo "    ${WEB_ORIGIN}/*"
echo "    ${WWW_ORIGIN}/*"
echo "    ${API_ORIGIN}/*"
echo ""

echo "=== Done ==="
echo "  Web:  ${WEB_ORIGIN}"
echo "  API:  ${API_ORIGIN}"
echo ""
echo "After DNS propagates, verify:"
echo "  curl -I ${WEB_ORIGIN}"
echo "  curl -I ${API_ORIGIN}/health"
