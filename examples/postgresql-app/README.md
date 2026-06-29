# Quark PostgreSQL example app

Small Nest/Fastify app that imports `@quark/core`, uses the native PostgreSQL
driver, and runs with Docker Compose.

The compose stack starts:

- `postgres`: PostgreSQL with a seeded `quark.users` table.
- `app`: Nest app exposing Quark-generated CRUD routes.

## Run with Docker Compose

From this directory:

```bash
docker compose up --build
```

Then call the app from the host:

```bash
curl http://localhost:3013/meta/users

curl -X POST http://localhost:3013/meta/users \
  -H 'content-type: application/json' \
  -d '{"name":"Mary Jackson","email":"mary@example.com"}'
```

PostgreSQL is also exposed on `localhost:5433`:

```bash
psql postgresql://quark:quark@localhost:5433/quark
```

## Reset the database

The seed SQL runs only when the PostgreSQL volume is first created. To reset:

```bash
docker compose down -v
docker compose up --build
```

## Local build

From the repository root:

```bash
corepack pnpm install
corepack pnpm --filter @quark/core build
corepack pnpm --filter @quark/example-postgresql-app build
```

To run the smoke test outside Docker, point it to a reachable PostgreSQL
database:

```bash
POSTGRES_HOST=127.0.0.1 \
POSTGRES_PORT=5433 \
POSTGRES_USER=quark \
POSTGRES_PASSWORD=quark \
POSTGRES_DATABASE=quark \
corepack pnpm --filter @quark/example-postgresql-app smoke
```

## Files

- `docker-compose.yml` starts PostgreSQL and the app.
- `docker/postgres/init.sql` creates and seeds the `users` table.
- `src/database.ts` registers `createPostgresqlDatabaseService`.
- `src/users.controller.ts` imports `@MetaController` from `@quark/core`.
