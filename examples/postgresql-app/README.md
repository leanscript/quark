# Quark PostgreSQL example app

Small Nest/Fastify app that imports `@quark/core`, uses the native PostgreSQL
driver, and runs with Docker Compose.

The compose stack starts:

- `postgres`: PostgreSQL with seeded `users`, `profiles`, `posts`, `roles` and
  `user_roles` tables.
- `app`: Nest app exposing Quark-generated CRUD routes.

The app also applies the example schema on startup, so existing Docker volumes
created before the relation tables were added are upgraded automatically.

## Run with Docker Compose

From this directory:

```bash
docker compose up --build
```

Then call the app from the host:

```bash
curl http://localhost:3013/api

curl http://localhost:3013/meta/users

curl 'http://localhost:3013/meta/users/1?with=profile,posts,roles&select[profile]=bio&select[posts]=title&select[roles]=name'

curl -X POST http://localhost:3013/meta/users \
  -H 'content-type: application/json' \
  -d '{"name":"Mary Jackson","email":"mary@example.com"}'
```

The Swagger UI is available at `/api`, and the OpenAPI JSON document is
available at `/api-json`. The smoke test verifies that all generated
`@MetaController` routes are present in the OpenAPI document.

The `User` model demonstrates:

- `profile`: one-to-one relation on `profiles.user_id`.
- `posts`: one-to-many relation on `posts.user_id`.
- `roles`: many-to-many relation through `user_roles`.

The relation request selects only `bio`, `title` and `name` in the nested
objects.

PostgreSQL is also exposed on `localhost:5433`:

```bash
psql postgresql://quark:quark@localhost:5433/quark
```

## Reset the database

The app creates missing example tables at startup. To wipe all data and start
from a fresh PostgreSQL volume:

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
