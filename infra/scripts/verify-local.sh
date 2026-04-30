#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

err() {
  echo "verify-local: $*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || err "Docker is required (not found on PATH)."

if docker compose version >/dev/null 2>&1; then
  docker compose -f "$ROOT/docker-compose.yml" config -q
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose -f "$ROOT/docker-compose.yml" config -q
else
  err "Neither 'docker compose' nor 'docker-compose' is available."
fi

echo "OK: docker compose configuration is valid."
