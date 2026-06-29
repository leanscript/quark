---
outline: deep
---

# Native MongoDB driver

Quark ships a native MongoDB adapter built on the official `mongodb` driver. It
does not use an ORM.

## Configure the service

```ts
import { MetaModule, createMongoDatabaseService } from '@quark/core';

const DatabaseService = createMongoDatabaseService({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  database: process.env.MONGODB_DATABASE || 'quark',
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

## Example app

This repository includes a working MongoDB example with the same relation setup
as the SQL examples:

```bash
cd examples/mongodb-app
docker compose up --build
```

Then:

```http
GET /meta/users/64f000000000000000000001?with=profile,posts,roles&select[profile]=bio&select[posts]=title&select[roles]=name
```

You can also pass an existing native `MongoClient` or `Db`:

```ts
createMongoDatabaseService({
  client,
  database: 'quark',
});

createMongoDatabaseService({
  db,
});
```

Quark closes only the `MongoClient` instances it creates from `uri`. If you pass
your own `client` or `db`, your application remains responsible for its
lifecycle unless you set `closeClient: true`.

## Collections and primary keys

By default, the `target` passed to `@MetaController({ key })` is used as the
collection name:

```ts
@MetaController({
  key: 'users',
  schema: User,
  routes: ['GET', 'POST', 'PATCH', 'DESTROY'],
})
```

This maps to the `users` collection. You can override this with
`collectionName`:

```ts
createMongoDatabaseService({
  uri,
  database: 'quark',
  collectionName: (target) => `tenant_a_${target}`,
});
```

MongoDB uses `_id` as the default primary key. Declare it in your model when you
want generated `GET /meta/users/:id` routes to query by `_id`:

```ts
import { ObjectId } from 'mongodb';
import { MetaModel, PrimaryKey } from '@quark/core';

class User extends MetaModel {
  @PrimaryKey()
  _id?: ObjectId;
}
```

Route ids and query values targeting `_id` are converted to `ObjectId` when
they are valid ObjectId strings. You can mark additional fields for this
conversion, for example when HTTP filters target foreign keys stored as
ObjectId:

```ts
createMongoDatabaseService({
  uri,
  database: 'quark',
  objectIdFields: ['user_id', 'role_id'],
});
```

By default, documents returned by the MongoDB driver expose `_id` as `id` and
hide the raw `_id` key:

```json
{
  "id": "64f1b3f3c8f3a03f4c74a111",
  "name": "Ada Lovelace"
}
```

If you want to keep the `_id` key in responses, disable the alias:

```ts
createMongoDatabaseService({
  uri,
  database: 'quark',
  idAlias: false,
});
```

## Supported CRUD behavior

The MongoDB service implements the same `DatabaseServiceInterface` as the SQL
drivers:

- `find`, `findOne`, `findById`, `all`
- `add`, `addMany`
- `update`, `updateMany`
- `deleteOne`
- `count`
- `findWithRel`, `findOneWithRel`
- `aggregate`

Filters are simple equality checks. Array values are translated to `$in`.

```ts
await db.find('users', {
  status: 'active',
  _id: ['64f1b3f3c8f3a03f4c74a111', '64f1b3f3c8f3a03f4c74a222'],
});
```

Sorting uses the existing Quark convention:

```http
GET /meta/users?sort=-created_at,name
```

## Relations

MongoDB supports the same relation metadata as the SQL drivers:
`BelongsTo`, `HasMany`, `OneToOne` and `ManyToMany`.

```ts
class User extends MetaModel {
  @PrimaryKey()
  _id?: ObjectId;

  @OneToOne('profiles', 'user_id', { select: ['bio'] })
  profile: Profile;

  @HasMany('posts', 'user_id', { select: ['title'] })
  posts: Post[];

  @ManyToMany('user_roles', 'user_id', 'role_id', {
    target: 'roles',
    select: ['name'],
  })
  roles: Role[];
}
```

Then:

```http
GET /meta/users/64f1b3f3c8f3a03f4c74a111?with=profile,posts,roles
```

You can override selected relation fields per request:

```http
GET /meta/users/64f1b3f3c8f3a03f4c74a111?with=posts,roles&select[posts]=title&select[roles]=name
```

`fields[relation]` is accepted as an alias for `select[relation]`.

When a relation uses `select`, Quark still reads the internal join fields it
needs, such as foreign keys or related primary keys, but strips them from the
returned relation objects unless you explicitly selected them.

For many-to-many relations, the first decorator argument is the pivot
collection. Use `target` when the related collection name is different from the
property name.

## Aggregation

`aggregate` accepts a MongoDB aggregation pipeline or a callback when you need
the native `Db` and `Collection` objects:

```ts
await db.aggregate('users', [
  { $match: { status: 'active' } },
  { $group: { _id: '$status', count: { $sum: 1 } } },
]);

await db.aggregate('users', async (db, users) => {
  return users.distinct('email');
});
```
