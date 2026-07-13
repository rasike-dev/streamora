#!/usr/bin/env bash
# Map custom domains to Cloud Run services and apply CDN CORS.
# Usage: DOMAIN=streamora.app ENV=staging ./infra/scripts/setup-domain.sh
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-streamora-487815}"
REGION="${REGION:-us-central1}"
DOMAIN="${DOMAIN:-streamora.app}"
ENV="${ENV:-prod}"

echo "Mapping domains for ${DOMAIN} (${ENV})..."

# Web: streamora.app
gcloud run domain-mappings create \
  --service="streamora-web-${ENV}" \
  --domain="${DOMAIN}" \
  --region="$REGION" \
  --project="$PROJECT_ID" 2>/dev/null || echo "Web domain mapping may already exist"

# API: api.streamora.app
gcloud run domain-mappings create \
  --service="streamora-api-${ENV}" \
  --domain="api.${DOMAIN}" \
  --region="$REGION" \
  --project="$PROJECT_ID" 2>/dev/null || echo "API domain mapping may already exist"

echo ""
echo "DNS records (add at your registrar):"
gcloud run domain-mappings describe --domain="${DOMAIN}" --region="$REGION" --project="$PROJECT_ID" 2>/dev/null || true
gcloud run domain-mappings describe --domain="api.${DOMAIN}" --region="$REGION" --project="$PROJECT_ID" 2>/dev/null || true

echo ""
echo "Apply GCS CORS for production origins:"
echo "  sed 's/streamora.app/${DOMAIN}/g' infra/gcs-cors.json > /tmp/gcs-cors-prod.json"
echo "  gsutil cors set /tmp/gcs-cors-prod.json gs://streamora-renditions-${ENV}"
echo "  gsutil cors set /tmp/gcs-cors-prod.json gs://streamora-thumbs-${ENV}"
echo ""
echo "Production env vars to set:"
echo "  NEXT_PUBLIC_APP_URL=https://${DOMAIN}"
echo "  NEXT_PUBLIC_API_URL=https://api.${DOMAIN}"
echo "  ALLOWED_ORIGINS=https://${DOMAIN}"
echo "  UPLOAD_RESUMABLE_ORIGIN=https://${DOMAIN}"
echo "  CDN_BASE_URL=https://cdn.${DOMAIN}"
echo "  APP_BASE_URL=https://${DOMAIN}"
