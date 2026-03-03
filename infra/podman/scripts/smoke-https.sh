#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-https://localhost:8443}"
email="stack-$(date +%s)@example.com"

curl -kfsS "${base_url}/" >/dev/null
curl -kfsS "${base_url}/api/health" | grep '"status":"ok"' >/dev/null

curl -kfsS \
  -H 'content-type: application/json' \
  -X POST "${base_url}/api/auth/register" \
  -d "{\"email\":\"${email}\",\"password\":\"password123\",\"displayName\":\"Stack Player\"}" \
  | grep '"accessToken"' >/dev/null
