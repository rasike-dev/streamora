#!/usr/bin/env bash
# Pull production secrets from GCP Secret Manager into root `.env.production`.
# Non-secret values are preserved from the existing file or infra/env.production.example.
#
# Usage: ./infra/scripts/sync-env-production.sh
# Optional: CLERK_PK=pk_live_... CLERK_SK=sk_live_... to set Clerk prod keys
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-slpolinet-prod}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${REPO_ROOT}/.env.production"
EXAMPLE="${REPO_ROOT}/infra/env.production.example"

gcloud config set project "$PROJECT_ID" >/dev/null

DATABASE_URL="$(gcloud secrets versions access latest --secret=streamora-database-url-prod --project="$PROJECT_ID")"
CLERK_SECRET_KEY="${CLERK_SK:-$(gcloud secrets versions access latest --secret=streamora-clerk-secret-prod --project="$PROJECT_ID")}"
SCHEDULER_SECRET="$(gcloud secrets versions access latest --secret=streamora-scheduler-secret-prod --project="$PROJECT_ID")"
CLERK_PK="${CLERK_PK:-}"

if [[ -z "$CLERK_PK" && -f "${REPO_ROOT}/apps/web/.env.production.local" ]]; then
  CLERK_PK="$(grep '^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=' "${REPO_ROOT}/apps/web/.env.production.local" | cut -d= -f2- || true)"
fi
if [[ -z "$CLERK_PK" && -f "$OUT" ]]; then
  CLERK_PK="$(grep '^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=' "$OUT" | cut -d= -f2- || true)"
fi
[[ -n "$CLERK_PK" ]] || CLERK_PK="pk_live_REPLACE_ME"

# Start from example structure, then overlay synced secrets
cp "$EXAMPLE" "$OUT"

# Patch secrets and Cloud Run-aligned values
export DATABASE_URL CLERK_SECRET_KEY SCHEDULER_SECRET CLERK_PK
python3 - "$OUT" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
lines = path.read_text().splitlines()
secrets = {
    "DATABASE_URL": __import__("os").environ["DATABASE_URL"],
    "CLERK_SECRET_KEY": __import__("os").environ["CLERK_SECRET_KEY"],
    "SCHEDULER_SECRET": __import__("os").environ["SCHEDULER_SECRET"],
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": __import__("os").environ["CLERK_PK"],
    "ALLOWED_ORIGINS": "https://slpolinet.com,https://www.slpolinet.com,https://streamora-web-prod-834964503665.us-central1.run.app",
}
out = []
seen = set()
for line in lines:
    if not line or line.startswith("#"):
        out.append(line)
        continue
    if "=" not in line:
        out.append(line)
        continue
    key, _, _ = line.partition("=")
    if key in secrets:
        out.append(f"{key}={secrets[key]}")
        seen.add(key)
    else:
        out.append(line)
        seen.add(key)

extra = [
    "",
    "# --- synced from GCP ---",
    f"# Updated: {__import__('datetime').datetime.utcnow().isoformat()}Z",
]
if "PUBSUB_TOPIC_MEDIA_UPLOADED" not in seen:
    extra.extend([
        "PUBSUB_TOPIC_MEDIA_UPLOADED=media.uploaded",
        "PUBSUB_SUBSCRIPTION_MEDIA_UPLOADED=media-uploaded-prod-sub",
    ])
if "REGION" not in seen:
    extra.extend([
        "REGION=us-central1",
        "IMAGE_TAG=local-demo1",
    ])

path.write_text("\n".join(out + extra) + "\n")
PY

echo "Wrote ${OUT}"
echo "Clerk publishable key: ${CLERK_PK:0:12}... (set CLERK_PK=pk_live_... if still placeholder)"
