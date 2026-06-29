# Quark MySQL example app

Small Nest/Fastify app that imports `@quark/core`, uses the native MySQL driver,
and runs with Docker Compose.

The compose stack starts:

- `mysql`: MySQL 8.4 with seeded `users`, `profiles`, `posts`, `roles` and
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
curl http://localhost:3012/meta/users

curl 'http://localhost:3012/meta/users/1?with=profile,posts,roles&select[profile]=bio&select[posts]=title&select[roles]=name'

curl -X POST http://localhost:3012/meta/users \
  -H 'content-type: application/json' \
  -d '{"name":"Dorothy Vaughan","email":"dorothy@example.com"}'
```

The `User` model demonstrates:

- `profile`: one-to-one relation on `profiles.user_id`.
- `posts`: one-to-many relation on `posts.user_id`.
- `roles`: many-to-many relation through `user_roles`.

The relation request selects only `bio`, `title` and `name` in the nested
objects.

MySQL is also exposed on `localhost:3307`:

```bash
mysql -h 127.0.0.1 -P 3307 -u quark -pquark quark
```

## Reset the database

The app creates missing example tables at startup. To wipe all data and start
from a fresh MySQL volume:

```bash
docker compose down -v
docker compose up --build
```

## Local build

From the repository root:

```bash
corepack pnpm install
corepack pnpm --filter @quark/core build
corepack pnpm --filter @quark/example-mysql-app build
```

To run the smoke test outside Docker, point it to a reachable MySQL database:

```bash
MYSQL_HOST=127.0.0.1 \
MYSQL_PORT=3307 \
MYSQL_USER=quark \
MYSQL_PASSWORD=quark \
MYSQL_DATABASE=quark \
corepack pnpm --filter @quark/example-mysql-app smoke
```

## Files

- `docker-compose.yml` starts MySQL and the app.
- `docker/mysql/init.sql` creates and seeds the `users` table.
- `src/database.ts` registers `createMysqlDatabaseService`.
- `src/users.controller.ts` imports `@MetaController` from `@quark/core`.
