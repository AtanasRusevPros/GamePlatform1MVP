#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <backup-file.sql>" >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
compose_dir="$(cd "${script_dir}/.." && pwd)"
backup_file="$1"

cd "${compose_dir}"
podman-compose exec -T postgres psql -U "${POSTGRES_USER:-kids_games}" -d "${POSTGRES_DB:-kids_games}" < "${backup_file}"

