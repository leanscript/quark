import { ObjectId } from 'mongodb';
import { MongoDatabaseService } from './mongo-database.service';

class FakeCursor {
  private skipValue = 0;
  private limitValue: number | undefined;
  private sortValue: Record<string, 1 | -1> = {};

  constructor(private readonly rows: any[]) {}

  sort(sort: Record<string, 1 | -1>) {
    this.sortValue = sort;
    return this;
  }

  skip(value: number) {
    this.skipValue = value;
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  async toArray() {
    const sorted = [...this.rows].sort((left, right) => {
      for (const [key, direction] of Object.entries(this.sortValue)) {
        if (left[key] === right[key]) continue;
        return left[key] > right[key] ? direction : -direction;
      }

      return 0;
    });

    return sorted.slice(
      this.skipValue,
      this.limitValue === undefined
        ? undefined
        : this.skipValue + this.limitValue,
    );
  }
}

class FakeCollection {
  calls: Array<{ method: string; filter?: any; options?: any }> = [];

  constructor(private rows: any[]) {}

  find(filter = {}, options: any = {}) {
    this.calls.push({ method: 'find', filter, options });
    return new FakeCursor(
      this.rows
        .filter((row) => this.matches(row, filter))
        .map((row) => this.project(row, options.projection)),
    );
  }

  async findOne(filter = {}, options: any = {}) {
    this.calls.push({ method: 'findOne', filter, options });
    const row = this.rows.find((entry) => this.matches(entry, filter));
    return row ? this.project(row, options.projection) : null;
  }

  async insertOne(data: any) {
    const insertedId = data._id || new ObjectId();
    this.rows.push({ ...data, _id: insertedId });
    return { acknowledged: true, insertedId };
  }

  async insertMany(data: any[]) {
    const insertedIds = {};
    data.forEach((entry, index) => {
      const insertedId = entry._id || new ObjectId();
      insertedIds[index] = insertedId;
      this.rows.push({ ...entry, _id: insertedId });
    });

    return { insertedCount: data.length, insertedIds };
  }

  async updateOne(filter: any, update: any) {
    const row = this.rows.find((entry) => this.matches(entry, filter));
    if (!row) return { modifiedCount: 0 };

    Object.assign(row, update.$set);
    return { modifiedCount: 1 };
  }

  async updateMany(filter: any, update: any) {
    let modifiedCount = 0;
    this.rows.forEach((row) => {
      if (!this.matches(row, filter)) return;

      Object.assign(row, update.$set);
      modifiedCount += 1;
    });

    return { modifiedCount };
  }

  async deleteOne(filter: any) {
    const index = this.rows.findIndex((entry) => this.matches(entry, filter));
    if (index === -1) return { deletedCount: 0 };

    this.rows.splice(index, 1);
    return { deletedCount: 1 };
  }

  async countDocuments(filter: any) {
    return this.rows.filter((row) => this.matches(row, filter)).length;
  }

  aggregate(pipeline: any[]) {
    this.calls.push({ method: 'aggregate', filter: pipeline });
    return new FakeCursor(this.rows);
  }

  private matches(row: any, filter: any): boolean {
    return Object.entries(filter).every(([key, expected]) => {
      const actual = row[key];

      if (expected && Array.isArray((expected as any).$in)) {
        return (expected as any).$in.some((entry) => this.equal(actual, entry));
      }

      return this.equal(actual, expected);
    });
  }

  private equal(left: any, right: any): boolean {
    return this.mapKey(left) === this.mapKey(right);
  }

  private mapKey(value: any): string {
    return value instanceof ObjectId ? value.toHexString() : String(value);
  }

  private project(row: any, projection?: Record<string, 0 | 1>): any {
    if (!projection) return { ...row };

    const included = Object.entries(projection)
      .filter(([, value]) => value === 1)
      .map(([key]) => key);

    if (included.length === 0) return { ...row };

    return included.reduce((projected, key) => {
      if (Object.prototype.hasOwnProperty.call(row, key)) {
        projected[key] = row[key];
      }

      return projected;
    }, {});
  }
}

class FakeDb {
  readonly collections = new Map<string, FakeCollection>();

  constructor(seed: Record<string, any[]>) {
    Object.entries(seed).forEach(([name, rows]) => {
      this.collections.set(name, new FakeCollection(rows));
    });
  }

  collection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new FakeCollection([]));
    }

    return this.collections.get(name);
  }
}

describe('MongoDatabaseService', () => {
  it('converts primary key strings to ObjectId filters', async () => {
    const id = new ObjectId();
    const db = new FakeDb({
      users: [{ _id: id, name: 'Ada' }],
    });
    const service = new MongoDatabaseService({ db: db as any });

    const result = await service.findOne('users', { _id: id.toHexString() });

    expect(result).toEqual({ id: id.toHexString(), name: 'Ada' });
    expect(db.collections.get('users').calls[0].filter).toEqual({ _id: id });
  });

  it('keeps non-_id string identifiers as strings by default', async () => {
    const id = '64f000000000000000000001';
    const db = new FakeDb({
      users: [{ id, name: 'Ada' }],
    });
    const service = new MongoDatabaseService({
      db: db as any,
      primaryKey: 'id',
    });

    const result = await service.findOne('users', { id });

    expect(result).toEqual({ id, name: 'Ada' });
    expect(db.collections.get('users').calls[0].filter).toEqual({ id });
  });

  it('attaches selected one-to-one, one-to-many and many-to-many relations', async () => {
    const db = new FakeDb({
      users: [{ _id: 'u1', name: 'Ada' }],
      profiles: [
        {
          _id: 'p1',
          user_id: 'u1',
          bio: 'Wrote the first published computer program.',
        },
      ],
      posts: [
        { _id: 'post1', user_id: 'u1', title: 'First', body: 'Hidden' },
        { _id: 'post2', user_id: 'u1', title: 'Second', body: 'Hidden' },
      ],
      user_roles: [
        { _id: 'pivot1', user_id: 'u1', role_id: 'role1' },
        { _id: 'pivot2', user_id: 'u1', role_id: 'role2' },
      ],
      roles: [
        { _id: 'role1', name: 'admin', internal_code: 'hidden' },
        { _id: 'role2', name: 'author', internal_code: 'hidden' },
      ],
    });
    const service = new MongoDatabaseService({ db: db as any });

    const result = await service.findWithRel('users', {}, 1, {}, [
      {
        id: 'profile:profiles:oneToOne',
        property: 'profile',
        target: 'profiles',
        fk: 'user_id',
        type: 'oneToOne',
        select: ['bio'],
      },
      {
        id: 'posts:posts:hasMany',
        property: 'posts',
        target: 'posts',
        fk: 'user_id',
        type: 'hasMany',
        select: ['title'],
      },
      {
        id: 'roles:user_roles:manyToMany',
        property: 'roles',
        target: 'roles',
        collection: 'user_roles',
        ownKey: 'user_id',
        fk: 'role_id',
        type: 'manyToMany',
        select: ['name'],
      },
    ]);

    expect(result).toEqual([
      {
        id: 'u1',
        name: 'Ada',
        profile: { bio: 'Wrote the first published computer program.' },
        posts: [{ title: 'First' }, { title: 'Second' }],
        roles: [{ name: 'admin' }, { name: 'author' }],
      },
    ]);
    expect(db.collections.get('profiles').calls[0].options.projection).toEqual({
      bio: 1,
      user_id: 1,
      _id: 0,
    });
  });

  it('performs basic mutations with filtered safeguards', async () => {
    const db = new FakeDb({
      users: [{ _id: 'u1', name: 'Ada' }],
    });
    const service = new MongoDatabaseService({ db: db as any });

    await expect(
      service.update('users', {}, { name: 'Grace' }),
    ).rejects.toThrow('update requires at least one query filter.');

    await service.update('users', { _id: 'u1' }, { name: 'Grace' });
    await service.add('users', { _id: 'u2', name: 'Katherine' });
    await service.deleteOne('users', { _id: 'u1' });

    await expect(service.count('users')).resolves.toBe(1);
    await expect(service.findOne('users', { _id: 'u2' })).resolves.toEqual({
      id: 'u2',
      name: 'Katherine',
    });
  });

  it('can keep the native _id field when idAlias is disabled', async () => {
    const id = new ObjectId();
    const db = new FakeDb({
      users: [{ _id: id, name: 'Ada' }],
    });
    const service = new MongoDatabaseService({
      db: db as any,
      idAlias: false,
    });

    await expect(
      service.findOne('users', { _id: id.toHexString() }),
    ).resolves.toEqual({ _id: id.toHexString(), name: 'Ada' });
  });
});
