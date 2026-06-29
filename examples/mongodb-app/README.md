# Quark MongoDB example app

Small Nest/Fastify app that imports `@quark/core`, uses the native MongoDB
driver, and runs with Docker Compose.

The compose stack starts:

- `mongo`: MongoDB with seeded `users`, `profiles`, `posts`, `roles` and
  `user_roles` collections.
- `app`: Nest app exposing Quark-generated CRUD routes.

The compose file pins MongoDB to `mongo:7.0` because `mongo:8.0` currently
refuses to start on Linux kernel 6.19+.

The app applies the example data on startup, so existing Docker volumes are
upgraded automatically.

## Run with Docker Compose

From this directory:

```bash
docker compose up --build
```

Then call the app from the host:

```bash
curl http://localhost:3014/meta/users

curl 'http://localhost:3014/meta/users/64f000000000000000000001?with=profile,posts,roles&select[profile]=bio&select[posts]=title&select[roles]=name'

curl -X POST http://localhost:3014/meta/users \
  -H 'content-type: application/json' \
  -d '{"name":"Katherine Johnson","email":"katherine@example.com"}'
```

The `User` model demonstrates:

- `profile`: one-to-one relation on `profiles.user_id`.
- `posts`: one-to-many relation on `posts.user_id`.
- `roles`: many-to-many relation through `user_roles`.

The relation request selects only `bio`, `title` and `name` in the nested
objects.

MongoDB documents are returned with `id` instead of `_id` by default. The core
driver keeps `_id` internally for queries and relations.

MongoDB is also exposed on `localhost:27018`:

```bash
mongosh mongodb://localhost:27018/quark
```

## Reset the database

The app creates missing example data at startup. To wipe all data and start
from a fresh MongoDB volume:

```bash
docker compose down -v
docker compose up --build
```

## Local build

From the repository root:

```bash
corepack pnpm install
corepack pnpm --filter @quark/core build
corepack pnpm --filter @quark/example-mongodb-app build
```

To run the smoke test outside Docker, point it to a reachable MongoDB instance:

```bash
MONGODB_URI=mongodb://127.0.0.1:27018 \
MONGODB_DATABASE=quark \
corepack pnpm --filter @quark/example-mongodb-app smoke
```

## Files

- `docker-compose.yml` starts MongoDB and the app.
- `src/database.ts` registers `createMongoDatabaseService`.
- `src/schema.service.ts` creates indexes and seeds relation data.
- `src/users.controller.ts` imports `@MetaController` from `@quark/core`.
