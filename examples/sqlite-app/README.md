# Quark SQLite example app

Small Nest/Fastify app that imports `@quark/core`, uses the native SQLite
database driver, and exposes generated CRUD routes for a `users` table.

The app keeps SQLite in memory, so it is safe to run repeatedly.

## Install

From the repository root:

```bash
corepack pnpm install
```

## Run the smoke test

```bash
corepack pnpm --filter @quark/example-sqlite-app smoke
```

The smoke test boots Nest without opening a port and calls:

- `GET /meta/users`
- `POST /meta/users`
- `GET /meta/users/:id`

## Start the server

```bash
corepack pnpm --filter @quark/example-sqlite-app start
```

Then call:

```bash
curl http://localhost:3000/meta/users

curl -X POST http://localhost:3000/meta/users \
  -H 'content-type: application/json' \
  -d '{"name":"Katherine Johnson","email":"katherine@example.com"}'
```

## Files

- `src/database.ts` creates the in-memory SQLite database and registers
  `createSqliteDatabaseService`.
- `src/users.controller.ts` imports `@MetaController` from `@quark/core`.
- `src/user.model.ts` defines validation decorators used by Quark before insert.
