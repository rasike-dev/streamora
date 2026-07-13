#!/usr/bin/env bash
# Provision Streamora staging resources on GCP.
# Usage: PROJECT_ID=streamora-487815 REGION=us-central1 ./infra/scripts/provision-staging.sh
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-streamora-487815}"
REGION="${REGION:-us-central1}"
ENV_LABEL="${ENV_LABEL:-staging}"

echo "Provisioning Streamora ${ENV_LABEL} in project ${PROJECT_ID} (${REGION})..."

gcloud config set project "$PROJECT_ID"

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  pubsub.googleapis.com \
  vpcaccess.googleapis.com \
  cloudscheduler.googleapis.com \
  --project="$PROJECT_ID"

# Artifact Registry
gcloud artifacts repositories describe streamora \
  --location="$REGION" \
  --project="$PROJECT_ID" 2>/dev/null || \
gcloud artifacts repositories create streamora \
  --repository-format=docker \
  --location="$REGION" \
  --description="Streamora container images" \
  --project="$PROJECT_ID"

# Cloud SQL (PostgreSQL 15)
INSTANCE="streamora-${ENV_LABEL}"
gcloud sql instances describe "$INSTANCE" --project="$PROJECT_ID" 2>/dev/null || \
gcloud sql instances create "$INSTANCE" \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region="$REGION" \
  --storage-auto-increase \
  --backup \
  --project="$PROJECT_ID"

gcloud sql databases describe streamora --instance="$INSTANCE" --project="$PROJECT_ID" 2>/dev/null || \
gcloud sql databases create streamora --instance="$INSTANCE" --project="$PROJECT_ID"

# GCS buckets
for BUCKET_SUFFIX in originals thumbs renditions; do
  BUCKET="streamora-${BUCKET_SUFFIX}-${ENV_LABEL}"
  gsutil ls -b "gs://${BUCKET}" 2>/dev/null || gsutil mb -l "$REGION" -p "$PROJECT_ID" "gs://${BUCKET}"
done

# Pub/Sub
gcloud pubsub topics describe video.uploaded --project="$PROJECT_ID" 2>/dev/null || \
gcloud pubsub topics create video.uploaded --project="$PROJECT_ID"

SUB="video-uploaded-${ENV_LABEL}-sub"
gcloud pubsub subscriptions describe "$SUB" --project="$PROJECT_ID" 2>/dev/null || \
gcloud pubsub subscriptions create "$SUB" \
  --topic=video.uploaded \
  --ack-deadline=600 \
  --project="$PROJECT_ID"

# VPC connector for Cloud Run → Cloud SQL
CONNECTOR="streamora-${ENV_LABEL}"
gcloud compute networks vpc-access connectors describe "$CONNECTOR" \
  --region="$REGION" --project="$PROJECT_ID" 2>/dev/null || \
gcloud compute networks vpc-access connectors create "$CONNECTOR" \
  --region="$REGION" \
  --network=default \
  --range=10.8.0.0/28 \
  --project="$PROJECT_ID"

echo ""
echo "Staging resources created. Next steps:"
echo "  1. Create secrets in Secret Manager (DATABASE_URL, CLERK_*, SCHEDULER_SECRET)"
echo "  2. Run: ./infra/scripts/deploy-staging.sh"
echo "  3. Apply CORS: gsutil cors set infra/gcs-cors.json gs://streamora-renditions-${ENV_LABEL}"
