#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-http://localhost:8080}"

curl -fsS "${base_url}/" >/dev/null
curl -fsS "${base_url}/api/health" | grep '"status":"ok"' >/dev/null
