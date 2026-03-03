#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
compose_dir="$(cd "${script_dir}/.." && pwd)"
timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="${compose_dir}/backups"
mkdir -p "${backup_dir}"

cd "${compose_dir}"
podman-compose exec -T postgres pg_dump -U "${POSTGRES_USER:-kids_games}" "${POSTGRES_DB:-kids_games}" > "${backup_dir}/pg-${timestamp}.sql"

