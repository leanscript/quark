---
outline: deep
---

# Native SQL drivers

Quark ships a small native SQL adapter for MySQL, PostgreSQL and SQLite. It does
not use an ORM or an external query builder. The core service builds parameterized
SQL itself, then delegates execution to the native package for the selected
database.

## Install the native client

Install only the client you need in your NestJS application:

```bash
pnpm add pg
pnpm add mysql2
pnpm add better-sqlite3
```

Quark does not install these clients for you. It loads the matching package
lazily when the matching driver is used.

## Example app

This repository includes working SQL examples:

```bash
corepack pnpm --filter @quark/example-sqlite-app smoke
corepack pnpm --filter @quark/example-sqlite-app start
```

The MySQL example ships with Docker Compose:

```bash
cd examples/mysql-app
docker compose up --build
```

The PostgreSQL example also ships with Docker Compose:

```bash
cd examples/postgresql-app
docker compose up --build
```

## PostgreSQL

```ts
import {
  MetaModule,
  createPostgresqlDatabaseService,
} from '@quark/core';

const DatabaseService = createPostgresqlDatabaseService({
  connection: {
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
  },
});

@Module({
  imports: [
    MetaModule.forRoot({
      DatabaseService,
      SearchService,
    }),
  ],
})
export class AppModule {}
```

## MySQL

```ts
import { MetaModule, createMysqlDatabaseService } from '@quark/core';

const DatabaseService = createMysqlDatabaseService({
  connection: {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  },
});
```

## SQLite

```ts
import { MetaModule, createSqliteDatabaseService } from '@quark/core';

const DatabaseService = createSqliteDatabaseService({
  filename: './data/app.sqlite',
});
```

For tests, `filename: ':memory:'` creates an in-memory database.

## Naming tables

By default, the `target` passed to `@MetaController({ key })` is used as the
table name:

```ts
@MetaController({
  key: 'users',
  schema: User,
  routes: ['GET', 'POST', 'PATCH', 'DESTROY'],
})
```

This maps to the `users` SQL table. You can override this with `tableName`:

```ts
const DatabaseService = createPostgresqlDatabaseService({
  connection,
  tableName: (target) => `public.${target}`,
});
```

SQL identifiers are validated and quoted by the driver. Dynamic table and column
names must use simple SQL identifiers such as `users`, `public.users` or
`created_at`.

## Primary keys

The SQL driver assumes `id` as the primary key. Override it globally or per
target:

```ts
const DatabaseService = createMysqlDatabaseService({
  connection,
  primaryKey: (target) => (target === 'users' ? 'uuid' : 'id'),
});
```

## Supported CRUD behavior

The native SQL service implements the `DatabaseServiceInterface` used by
`MetaService`:

- `find`, `findOne`, `findById`, `all`
- `add`, `addMany`
- `update`, `updateMany`
- `deleteOne`
- `count`
- `findWithRel`, `findOneWithRel`
- `aggregate`

Filters are simple equality checks. Array values are translated to `IN (...)`
and `null` is translated to `IS NULL`.

```ts
await db.find('users', {
  status: 'active',
  id: ['1', '2'],
});
```

Sorting uses the existing Quark convention:

```http
GET /meta/users?sort=-created_at,name
```

## Relations

The SQL driver resolves relations with additional parameterized queries.

```ts
class User extends MetaModel {
  @HasMany('posts', 'user_id')
  posts: Post[];
}
```

Then:

```http
GET /meta/users?with=posts
```

`BelongsTo`, `HasMany` and `ManyToMany` are supported with the metadata already
created by Quark decorators. For many-to-many relations, the decorator argument
is treated as the join table:

```ts
class Product extends MetaModel {
  @ManyToMany('product_features', 'product_id', 'feature_id')
  features: Feature[];
}
```

## Custom native clients

You can pass an existing native connection or pool instead of connection
options:

```ts
const DatabaseService = createPostgresqlDatabaseService({
  pool,
});

const DatabaseService = createMysqlDatabaseService({
  pool,
});

const DatabaseService = createSqliteDatabaseService({
  database,
});
```

Quark will close only the connections it creates itself. If you pass your own
pool or database instance, your application remains responsible for its
lifecycle.

## Raw SQL

`aggregate` can run raw SQL when you need to leave the generic CRUD surface:

```ts
await db.aggregate('users', {
  sql: 'SELECT status, COUNT(*) AS count FROM users GROUP BY status',
});
```

You can also receive the low-level driver:

```ts
await db.aggregate('users', async (driver, table) => {
  return driver.query(`SELECT * FROM ${table} WHERE status = ?`, ['active']);
});
```
