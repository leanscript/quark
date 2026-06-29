import { quoteBacktick } from '../identifier';
import { SqlDriver, SqlParameter, SqlQueryResult } from '../types';
import { loadNativePackage } from './native-package';

type MysqlPool = {
  execute(sql: string, params?: SqlParameter[]): Promise<[any, any]>;
  end?(): Promise<void>;
};

export interface MysqlDriverOptions {
  connection?: any;
  pool?: MysqlPool;
}

export class MysqlDriver implements SqlDriver {
  readonly dialect = 'mysql' as const;

  private ownedPool?: MysqlPool;

  constructor(private readonly options: MysqlDriverOptions) {}

  async query<Row = any>(
    sql: string,
    params: SqlParameter[] = [],
  ): Promise<SqlQueryResult<Row>> {
    const pool = await this.getPool();
    const normalizedQuery = this.normalizePagingPlaceholders(sql, params);
    const [result] = await pool.execute(
      normalizedQuery.sql,
      normalizedQuery.params,
    );

    if (Array.isArray(result)) {
      return { rows: result as Row[] };
    }

    return {
      rows: [],
      affectedRows: result?.affectedRows,
      insertId: result?.insertId,
    };
  }

  async close(): Promise<void> {
    await this.ownedPool?.end?.();
  }

  quoteIdentifier(identifier: string): string {
    return quoteBacktick(identifier);
  }

  private async getPool(): Promise<MysqlPool> {
    if (this.options.pool) return this.options.pool;
    if (this.ownedPool) return this.ownedPool;

    const mysql = await loadNativePackage<any>('mysql2/promise');
    this.ownedPool = mysql.createPool(this.options.connection);
    return this.ownedPool;
  }

  private normalizePagingPlaceholders(
    sql: string,
    params: SqlParameter[],
  ): { sql: string; params: SqlParameter[] } {
    let paramIndex = 0;
    const nextParams: SqlParameter[] = [];

    const normalizedSql = sql.replace(/\?/g, (_placeholder, offset) => {
      const prefix = sql.slice(Math.max(0, offset - 20), offset);
      const value = params[paramIndex++];

      if (/\blimit\s*$/i.test(prefix)) {
        return String(this.sqlInteger(value, 'limit'));
      }

      if (/\boffset\s*$/i.test(prefix)) {
        return String(this.sqlInteger(value, 'offset'));
      }

      nextParams.push(value);
      return '?';
    });

    return { sql: normalizedSql, params: nextParams };
  }

  private sqlInteger(value: SqlParameter, label: string): number {
    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw new Error(`Invalid MySQL ${label}: ${value}`);
    }

    return parsed;
  }
}
