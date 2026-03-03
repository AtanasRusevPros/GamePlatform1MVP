# Architecture

## Overview

The MVP is a local-first monorepo with a React web client, a Fastify API, shared contracts, SQL migrations, and an optional full local runtime stack behind Caddy.

## High-Level Components

```mermaid
flowchart LR
  User[Browser User]
  Web[apps/web<br/>React + Vite]
  Caddy[Caddy Reverse Proxy]
  Api[apps/api<br/>Fastify + TypeScript]
  Shared[packages/shared<br/>schemas + DTOs + API client]
  SDK[packages/game-sdk]
  PG[(Postgres / pg-mem)]
  Valkey[(Valkey)]
  Seed[Seed JSON]

  User --> Web
  Web --> Shared
  Web --> SDK
  Web -->|/api in dev or through proxy| Api
  Caddy --> Web
  Caddy --> Api
  Api --> Shared
  Api --> PG
  Api --> Valkey
  Api --> Seed
```

## Monorepo Structure

```mermaid
flowchart TD
  Root[Repo Root]
  Root --> Apps[apps]
  Root --> Packages[packages]
  Root --> Infra[infra]
  Root --> Tests[tests]
  Root --> CI[.github/workflows]

  Apps --> Api[api]
  Apps --> Web[web]
  Apps --> Mobile[mobile placeholder]

  Packages --> Shared[shared]
  Packages --> GameSdk[game-sdk]

  Infra --> Podman[podman]
  Infra --> Sql[sql]

  Tests --> Unit[unit]
  Tests --> Integration[integration]
  Tests --> WebTests[web]
  Tests --> E2E[e2e]
```

## Runtime Modes

### Direct development mode

```mermaid
flowchart LR
  Browser -->|http://127.0.0.1:5173| Vite[Vite Dev Server]
  Vite -->|proxy /api| Api[Fastify API]
  Api -->|default| Mem[(pg-mem)]
```

Characteristics:
- fastest local feedback loop
- no Caddy required
- data resets when the API restarts unless a real `DATABASE_URL` is configured

### Full local stack mode

```mermaid
flowchart LR
  Browser -->|http://localhost:8080| Caddy
  Browser -->|https://localhost:8443| Caddy
  Caddy -->|static app| WebBuild[Built web assets]
  Caddy -->|/api/*| Api[Fastify API container]
  Api --> Postgres[(Postgres)]
  Api --> Valkey[(Valkey)]
```

Characteristics:
- proxied production-like local flow
- persistent database
- local HTTPS through `tls internal`

## Backend Design

Main backend layers:
- config loading
- server bootstrap
- auth service
- route handlers
- repository layer
- migrations and seed runner

```mermaid
flowchart TD
  Route[Fastify Routes]
  Auth[Auth Service]
  Repo[Repositories]
  DB[(Postgres / pg-mem)]
  Idem[Idempotency Repository]

  Route --> Auth
  Route --> Repo
  Auth --> Repo
  Repo --> DB
  Route --> Idem
  Idem --> DB
```

### Auth model

- access tokens: JWT
- refresh tokens: opaque tokens stored server-side
- protected routes use Bearer authentication
- refresh/logout invalidate refresh state on the server

### Progress write model

- progress writes require `Idempotency-Key`
- server stores idempotency records in Postgres
- client retries safely after reconnect

## Frontend Design

Main frontend pieces:
- auth provider
- routed application shell
- game registry
- flashcards page
- offline queue
- local progress helpers

```mermaid
flowchart TD
  AppRoutes[AppRoutes]
  AuthProvider[AuthProvider]
  MainMenu[Main Menu]
  Flashcards[Flashcards Page]
  Queue[Offline Queue]
  Client[Shared API Client]

  AppRoutes --> AuthProvider
  AuthProvider --> MainMenu
  AuthProvider --> Flashcards
  Flashcards --> Queue
  Flashcards --> Client
```

## Data Model

Core persisted entities from the MVP schema:

```mermaid
erDiagram
  USERS ||--o{ USER_DECK_PROGRESS : has
  USERS ||--o{ USER_KNOWN_CARDS : has
  USERS ||--|| USER_POINTS : has
  USERS ||--o{ USER_GAME_POINTS : has
  GAMES ||--o{ DECKS : contains
  DECKS ||--o{ CARDS : contains
  DECKS ||--o{ USER_DECK_PROGRESS : tracks
  DECKS ||--o{ USER_KNOWN_CARDS : tracks
  CARDS ||--o{ USER_KNOWN_CARDS : marks
  GAMES ||--o{ USER_GAME_POINTS : tracks
```

Important tables:
- `users`
- `games`
- `decks`
- `cards`
- `user_deck_progress`
- `user_known_cards`
- `user_points`
- `user_game_points`
- `idempotency_keys`

## API Interaction Sequences

### Register

```mermaid
sequenceDiagram
  actor User
  participant Web as Web App
  participant Api as API
  participant Auth as Auth Service
  participant DB as Database

  User->>Web: Submit register form
  Web->>Api: POST /auth/register
  Api->>Auth: validate + create user
  Auth->>DB: insert user + refresh token state
  DB-->>Auth: persisted user
  Auth-->>Api: auth response
  Api-->>Web: access token + refresh token + user
  Web-->>User: authenticated session
```

### Login And Session Restore

```mermaid
sequenceDiagram
  actor User
  participant Web as Web App
  participant Api as API
  participant Auth as Auth Service
  participant DB as Database

  User->>Web: Submit login form
  Web->>Api: POST /auth/login
  Api->>Auth: verify credentials
  Auth->>DB: load user + store refresh token
  DB-->>Auth: user/session data
  Auth-->>Api: access token + refresh token
  Api-->>Web: authenticated response

  Web->>Api: GET /auth/me with Bearer token
  Api->>DB: load user context
  DB-->>Api: user
  Api-->>Web: current user
```

### Flashcards Load

```mermaid
sequenceDiagram
  actor User
  participant Web as Flashcards Page
  participant Api as API
  participant DB as Database

  User->>Web: Open flashcards
  Web->>Api: GET /flashcards/decks?lang=en
  Api->>DB: query enabled decks
  DB-->>Api: decks
  Api-->>Web: deck list

  Web->>Api: GET /flashcards/decks/:deckId/cards
  Api->>DB: query cards
  DB-->>Api: cards
  Api-->>Web: cards

  Web->>Api: GET /flashcards/decks/:deckId/progress
  Api->>DB: load or create progress
  DB-->>Api: progress
  Api-->>Web: progress
```

### Mark Known With Idempotency

```mermaid
sequenceDiagram
  actor User
  participant Web as Flashcards Page
  participant Api as API
  participant Idem as Idempotency Store
  participant DB as Database

  User->>Web: Click Mark Known
  Web->>Api: POST /flashcards/decks/:deckId/known + Idempotency-Key
  Api->>Idem: lookup key for user/deck scope
  alt cached response exists
    Idem-->>Api: cached success payload
    Api-->>Web: cached progress response
  else new write
    Api->>DB: insert known card + update progress
    DB-->>Api: updated progress
    Api->>Idem: store response by scope and key
    Api-->>Web: progress response
  end
```

### Offline Queue Replay

```mermaid
sequenceDiagram
  actor User
  participant Web as Flashcards Page
  participant Queue as Offline Queue
  participant Api as API
  participant DB as Database

  User->>Web: Navigate or mark known while offline
  Web->>Queue: enqueue write operation
  Queue-->>Web: local optimistic state update

  Note over Web,Queue: Browser reconnects

  Web->>Queue: flush pending operations
  loop each queued operation
    Queue->>Api: replay request with Idempotency-Key
    Api->>DB: apply write or return cached result
    DB-->>Api: updated progress
    Api-->>Queue: success response
  end
  Queue-->>Web: latest progress per deck
```

## Testing Architecture

```mermaid
flowchart LR
  Unit[Unit Tests] --> Helpers[helpers and pure logic]
  Integration[Integration Tests] --> Api[API + DB behavior]
  WebTests[Web Tests] --> UI[React screens]
  E2E[E2E Tests] --> Flow[real browser user flow]
```

Test roles:
- unit tests cover auth helpers and offline queue logic
- integration tests cover auth, DB, and flashcards API behavior
- web tests cover auth and flashcards UI behavior
- Playwright covers register, open deck, mark known, reload, and persisted progress

## Deployment Notes

- Caddy serves built frontend assets
- Caddy proxies `/api/*` to the API container
- API can auto-run migrations and seed data on startup
- Postgres is the durable store
- Valkey is provisioned for future hot-state use, but current MVP logic does not depend on it

## Current Architectural Gaps

- no points service yet
- no rate limiting yet
- no active Valkey-backed behavior yet
- no `/metrics` endpoint
- only one game is implemented
