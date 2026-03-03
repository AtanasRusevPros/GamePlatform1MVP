# Local Podman Stack

This directory contains the local runtime stack for the MVP.

Services:
- `postgres`
- `valkey`
- `api`
- `caddy`

Quick start:
1. Copy `.env.example` to `.env`.
2. Set strong local values for `POSTGRES_PASSWORD` and `JWT_SECRET`.
3. Run `./scripts/deploy.sh`.
4. Open `https://localhost:8443` or `http://localhost:8080`.

Notes:
- Caddy uses `tls internal` for local HTTPS.
- The API auto-runs migrations and seed data inside the stack.
- Backup and restore helpers are in `scripts/backup.sh` and `scripts/restore.sh`.
