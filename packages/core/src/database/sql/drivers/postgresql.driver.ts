import { quoteDouble } from '../identifier';
import { SqlDriver, SqlParameter, SqlQueryResult } from '../types';
import { loadNativePackage } from './native-package';

type PostgresqlPool = {
  query(
    sql: string,
    params?: SqlParameter[],
  ): Promise<{
    rows?: any[];
    rowCount?: number;
  }>;
  end?(): Promise<void>;
};

export interface PostgresqlDriverOptions {
  connection?: any;
  pool?: PostgresqlPool;
}

export class PostgresqlDriver implements SqlDriver {
  readonly dialect = 'postgresql' as const;

  private ownedPool?: PostgresqlPool;

  constructor(private readonly options: PostgresqlDriverOptions) {}

  async query<Row = any>(
    sql: string,
    params: SqlParameter[] = [],
  ): Promise<SqlQueryResult<Row>> {
    const pool = await this.getPool();
    const result = await pool.query(this.replacePlaceholders(sql), params);

    return {
      rows: (result.rows || []) as Row[],
      affectedRows: result.rowCount,
    };
  }

  async close(): Promise<void> {
    await this.ownedPool?.end?.();
  }

  quoteIdentifier(identifier: string): string {
    return quoteDouble(identifier);
  }

  private async getPool(): Promise<PostgresqlPool> {
    if (this.options.pool) return this.options.pool;
    if (this.ownedPool) return this.ownedPool;

    const pg = await loadNativePackage<any>('pg');
    const Pool = pg.Pool || pg.default?.Pool;
    this.ownedPool = new Pool(this.options.connection);
    return this.ownedPool;
  }

  private replacePlaceholders(sql: string): string {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  }
}
