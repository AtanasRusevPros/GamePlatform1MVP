# Kids Games Platform MVP

Local-first monorepo for a kids games platform MVP.

Current MVP scope:
- backend API with auth and flashcards endpoints
- web client with auth, main menu, and flashcards gameplay
- shared contracts and API client
- local Podman stack with Postgres, Valkey, API, and Caddy
- automated unit, integration, web, and end-to-end tests

Primary game in this MVP:
- Flash Cards

## Repository Layout

```text
apps/
  api/          Fastify API, auth, DB access, migrations, seed scripts
  web/          React + Vite web app
  mobile/       placeholder only
packages/
  shared/       shared DTOs, schemas, API client
  game-sdk/     game module helpers
infra/
  podman/       local stack, Caddy, deploy/smoke scripts
  sql/          SQL migrations and seed content
tests/
  unit/
  integration/
  web/
  e2e/
```

## How The Project Works

The API provides:
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /games`
- `GET /flashcards/decks?lang=en`
- `GET /flashcards/decks/:deckId/cards`
- `GET /flashcards/decks/:deckId/progress`
- `POST /flashcards/decks/:deckId/known`
- `POST /flashcards/decks/:deckId/position`

The web app provides:
- registration and login
- protected main menu
- flashcards deck selection
- previous / next navigation
- shuffle
- mark known
- progress display
- offline write queue with retry on reconnect
- pronunciation playback via card audio path when available, otherwise browser speech synthesis fallback

Local execution modes:
- direct development mode: API on `http://127.0.0.1:3001`, web on `http://127.0.0.1:5173`
- proxied stack mode: Caddy on `http://localhost:8080` and `https://localhost:8443`

Database modes:
- default local API mode uses in-memory Postgres-compatible storage via `pg-mem`
- stack mode uses real Postgres through Podman

## Prerequisites

- Node.js 20+
- npm
- Podman rootless
- `podman-compose`

Optional but useful:
- GitHub CLI for repo operations

## Installation

```bash
npm install
```

## Root Commands

### Development

```bash
npm run dev:api
npm run dev:web
```

### Database

```bash
npm run db:migrate
npm run db:seed
npm run db:reset
```

### Quality

```bash
npm run typecheck
npm run lint
npm run build
npm test
npm run test:unit
npm run test:integration
npm run test:web
npm run test:e2e
npm run test:e2e:stack
npm run test:full
```

## Podman Stack Commands

From the repo root:

```bash
bash infra/podman/scripts/deploy.sh
bash infra/podman/scripts/teardown.sh
bash infra/podman/scripts/smoke-http.sh
bash infra/podman/scripts/smoke-https.sh
bash infra/podman/scripts/backup.sh
bash infra/podman/scripts/restore.sh <backup-file>
```

Prepare the stack once:

```bash
cp infra/podman/.env.example infra/podman/.env
```

Then set at least:
- `POSTGRES_PASSWORD`
- `JWT_SECRET`

## Main Scenarios

### Scenario 1: Quick local app run

Use this when you want the fastest edit/run loop.

1. Run `npm run dev:api`
2. Run `npm run dev:web` in another terminal
3. Open `http://127.0.0.1:5173`

Notes:
- the web dev server proxies `/api` to the local API
- by default the API uses in-memory storage
- restarting the API resets data in this mode

### Scenario 2: Persistent local stack

Use this when you want the app behind Caddy with a real Postgres instance.

1. Copy `infra/podman/.env.example` to `infra/podman/.env`
2. Fill in local secrets
3. Run `bash infra/podman/scripts/deploy.sh`
4. Open `https://localhost:8443` or `http://localhost:8080`

Notes:
- the API auto-runs migrations and seed data inside the stack
- Caddy uses local internal TLS
- browser trust warnings are acceptable for local MVP use

### Scenario 3: Register and play flashcards

1. Open the app
2. Create an account on `/register`
3. Land on the main menu
4. Open Flash Cards
5. Pick the English deck
6. Navigate with Previous and Next
7. Use Shuffle for session-local order changes
8. Use Mark Known to persist known cards
9. Reload and confirm progress is preserved

### Scenario 4: Work offline briefly

1. Open Flash Cards while authenticated
2. Disconnect the browser/network
3. Navigate and mark cards known
4. Reconnect
5. The queued writes replay automatically

### Scenario 5: Rebuild local data

For direct local API mode with a configured Postgres database:

```bash
npm run db:reset
```

For the Podman stack:
- redeploy the stack if needed
- use the backup/restore scripts for DB snapshots

## Build And Test Guide

### Smallest checks

```bash
npm run typecheck
npm run lint
```

### Fast feature checks

```bash
npm run test:unit
npm run test:integration
npm run test:web
```

### Browser flow against local dev servers

```bash
npm run test:e2e
```

This starts the local API and web servers as configured by Playwright.

### Browser flow against the full proxied stack

Start the stack first, then run:

```bash
npm run test:e2e:stack
```

### Full local quality gate

```bash
npm run test:full
```

This runs:
- typecheck
- lint
- unit tests
- integration tests
- web tests
- Playwright end-to-end test

## Environment Notes

Key API environment variables:
- `API_HOST`
- `API_PORT`
- `API_LOG_LEVEL`
- `JWT_SECRET`
- `ACCESS_TOKEN_TTL_SECONDS`
- `REFRESH_TOKEN_TTL_SECONDS`
- `DATABASE_MODE`
- `DATABASE_URL`
- `DB_AUTO_MIGRATE`
- `DB_AUTO_SEED`
- `DB_CONNECT_RETRIES`
- `DB_CONNECT_RETRY_DELAY_MS`

Behavior:
- if `DATABASE_URL` is missing, the API defaults to in-memory DB mode
- if `DATABASE_MODE=postgres`, `DATABASE_URL` is required

## Seed Content

Current seed content:
- one enabled flashcards game
- one English deck
- basic example cards from `infra/sql/seeds/flashcards.en.basic.json`

## CI

CI is defined in `.github/workflows/ci.yml`.

It runs:
- `npm ci`
- Playwright browser install
- typecheck
- lint
- unit tests
- integration tests
- web tests
- build
- end-to-end tests

## Current Known MVP Boundaries

Implemented:
- auth flow
- flashcards gameplay
- progress persistence
- offline queue
- local stack
- local HTTPS

Not yet implemented:
- points flow
- rate limiting
- active Valkey-backed backend features
- non-flashcards games
- mobile app
- full observability stack

## Related Documents

- [Architecture](./ARCHITECTURE.md)
- [Implementation Status](./IMPLEMENTATION_STATUS.md)
- [Initial Agent Plan](./Cursor_Plan_Kids_Games_Platform_AGENT.md)
- [Phase Plan](./Cursor_Plan_Kids_Games_Platform_PHASES.md)
