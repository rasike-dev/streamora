#!/usr/bin/env bash
# Seed production/staging taxonomy (categories, subcategories, demo channels/tags).
#
# Requires: gcloud auth, Cloud SQL Auth Proxy on PATH (or cloud-sql-proxy).
# Usage:
#   ./infra/scripts/seed-production.sh
#   ENV=prod PROJECT_ID=slpolinet-prod ./infra/scripts/seed-production.sh
#   SKIP_MIGRATE=true ./infra/scripts/seed-production.sh   # seed only
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-slpolinet-prod}"
REGION="${REGION:-us-central1}"
ENV="${ENV:-prod}"
INSTANCE="streamora-${ENV}"
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE}"
PROXY_PORT="${PROXY_PORT:-5433}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SKIP_MIGRATE="${SKIP_MIGRATE:-false}"

if ! command -v cloud-sql-proxy >/dev/null 2>&1; then
  echo "cloud-sql-proxy not found. Install: https://cloud.google.com/sql/docs/postgres/sql-proxy"
  exit 1
fi

gcloud config set project "$PROJECT_ID" >/dev/null

if [[ ! -f "${REPO_ROOT}/.env.production" ]]; then
  echo "Syncing .env.production from Secret Manager..."
  "${REPO_ROOT}/infra/scripts/sync-env-production.sh"
fi

DATABASE_URL="$(grep '^DATABASE_URL=' "${REPO_ROOT}/.env.production" | cut -d= -f2-)"
if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL missing in .env.production"
  exit 1
fi

# Build a TCP URL for the local Auth Proxy from the Cloud SQL socket URL.
LOCAL_DATABASE_URL="$(python3 - "$DATABASE_URL" "$PROXY_PORT" <<'PY'
import sys
from urllib.parse import quote, unquote, urlparse, urlunparse

raw = sys.argv[1]
port = sys.argv[2]
parsed = urlparse(raw)
user = parsed.username or "streamora"
password = parsed.password or ""
host = f"127.0.0.1:{port}"
netloc = f"{quote(unquote(user), safe='')}:{quote(unquote(password), safe='')}@{host}"
print(urlunparse((parsed.scheme, netloc, parsed.path or "/streamora", "", "", "")))
PY
)"

echo "Starting Cloud SQL Auth Proxy on 127.0.0.1:${PROXY_PORT} (${CONNECTION_NAME})..."
cloud-sql-proxy "${CONNECTION_NAME}" --port "${PROXY_PORT}" >/tmp/streamora-sql-proxy.log 2>&1 &
PROXY_PID=$!

cleanup() {
  kill "${PROXY_PID}" 2>/dev/null || true
}
trap cleanup EXIT

for _ in $(seq 1 30); do
  if (echo >/dev/tcp/127.0.0.1/"${PROXY_PORT}") >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

cd "${REPO_ROOT}/apps/api"

if [[ "$SKIP_MIGRATE" != "true" ]]; then
  echo "Running prisma migrate deploy..."
  DATABASE_URL="${LOCAL_DATABASE_URL}" pnpm exec prisma migrate deploy
fi

echo "Seeding taxonomy and demo content..."
DATABASE_URL="${LOCAL_DATABASE_URL}" pnpm exec prisma db seed

echo "Done. Categories should appear at https://slpolinet.com/en/categories"
