# SQL Migrations

Migration files in this directory are executed in lexical order by the local migration runner in `apps/api/src/db/migrations.ts`.

Current notes:
- `001_initial_schema.sql` creates the MVP schema for auth, catalog, progress, points, and future-ready sessions.
- Seed data is stored separately under `infra/sql/seeds/`.

