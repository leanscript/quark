import { SqlDatabaseService } from './sql-database.service';
import { SqlDriver, SqlParameter, SqlQueryResult } from './types';

class FakeDriver implements SqlDriver {
  readonly dialect = 'postgresql' as const;
  queries: Array<{ sql: string; params: SqlParameter[] }> = [];
  results: SqlQueryResult[] = [];
  nextResult: SqlQueryResult = { rows: [] };

  async query<Row = any>(
    sql: string,
    params: SqlParameter[] = [],
  ): Promise<SqlQueryResult<Row>> {
    this.queries.push({ sql, params });
    return (this.results.shift() || this.nextResult) as SqlQueryResult<Row>;
  }

  quoteIdentifier(identifier: string): string {
    return identifier
      .split('.')
      .map((part) => `"${part}"`)
      .join('.');
  }
}

describe('SqlDatabaseService', () => {
  it('builds parameterized filters with literal safe paging', async () => {
    const driver = new FakeDriver();
    driver.nextResult = { rows: [{ id: 1, name: 'Ada' }] };
    const service = new SqlDatabaseService({ driver, perPage: 10 });

    const rows = await service.find(
      'users',
      { status: 'active', id: [1, 2] },
      2,
      { createdAt: -1 },
    );

    expect(rows).toEqual([{ id: 1, name: 'Ada' }]);
    expect(driver.queries[0]).toEqual({
      sql: 'SELECT * FROM "users" WHERE "status" = ? AND "id" IN (?, ?) ORDER BY "createdAt" DESC LIMIT 10 OFFSET 10',
      params: ['active', 1, 2],
    });
  });

  it('returns inserted ids from PostgreSQL returning rows', async () => {
    const driver = new FakeDriver();
    driver.nextResult = { rows: [{ id: '42' }], affectedRows: 1 };
    const service = new SqlDatabaseService({ driver });

    const result = await service.add('users', { name: 'Grace' });

    expect(result).toEqual({ insertedId: '42', affectedRows: 1 });
    expect(driver.queries[0]).toEqual({
      sql: 'INSERT INTO "users" ("name") VALUES (?) RETURNING "id"',
      params: ['Grace'],
    });
  });

  it('rejects single-row mutations without filters', async () => {
    const driver = new FakeDriver();
    const service = new SqlDatabaseService({ driver });

    await expect(service.update('users', {}, { name: 'Ada' })).rejects.toThrow(
      'update requires at least one query filter.',
    );
    await expect(service.deleteOne('users', {})).rejects.toThrow(
      'deleteOne requires at least one query filter.',
    );
  });

  it('attaches has-many relations without mutating base rows', async () => {
    const driver = new FakeDriver();
    driver.results = [
      { rows: [{ id: '1', name: 'Ada' }] },
      {
        rows: [
          { id: '10', userId: '1', title: 'First' },
          { id: '11', userId: '1', title: 'Second' },
        ],
      },
    ];
    const service = new SqlDatabaseService({ driver });

    const result = await service.findWithRel(
      'users',
      {},
      1,
      {},
      {
        id: 'posts:posts:hasMany',
        property: 'posts',
        target: 'posts',
        fk: 'userId',
        type: 'hasMany',
      },
    );

    expect(result).toEqual([
      {
        id: '1',
        name: 'Ada',
        posts: [
          { id: '10', userId: '1', title: 'First' },
          { id: '11', userId: '1', title: 'Second' },
        ],
      },
    ]);
  });
});
