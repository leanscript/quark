import { quoteDouble } from '../identifier';
import { SqlDriver, SqlParameter, SqlQueryResult } from '../types';
import { loadNativePackage } from './native-package';

type SqliteStatement = {
  all(...params: SqlParameter[]): any[];
  run(...params: SqlParameter[]): {
    changes?: number;
    lastInsertRowid?: string | number | bigint;
  };
};

type SqliteDatabase = {
  prepare(sql: string): SqliteStatement;
  close?(): void;
};

export interface SqliteDriverOptions {
  database?: SqliteDatabase;
  filename?: string;
  options?: any;
}

export class SqliteDriver implements SqlDriver {
  readonly dialect = 'sqlite' as const;

  private ownedDatabase?: SqliteDatabase;

  constructor(private readonly options: SqliteDriverOptions) {}

  async query<Row = any>(
    sql: string,
    params: SqlParameter[] = [],
  ): Promise<SqlQueryResult<Row>> {
    const database = await this.getDatabase();
    const statement = database.prepare(sql);

    if (this.returnsRows(sql)) {
      return { rows: statement.all(...params) as Row[] };
    }

    const result = statement.run(...params);
    return {
      rows: [],
      affectedRows: result.changes,
      insertId: result.lastInsertRowid,
    };
  }

  close(): void {
    this.ownedDatabase?.close?.();
  }

  quoteIdentifier(identifier: string): string {
    return quoteDouble(identifier);
  }

  private async getDatabase(): Promise<SqliteDatabase> {
    if (this.options.database) return this.options.database;
    if (this.ownedDatabase) return this.ownedDatabase;

    const sqlite = await loadNativePackage<any>('better-sqlite3');
    const Database = sqlite.default || sqlite;
    this.ownedDatabase = new Database(
      this.options.filename || ':memory:',
      this.options.options,
    );
    return this.ownedDatabase;
  }

  private returnsRows(sql: string): boolean {
    return /^\s*(select|with|pragma)\b/i.test(sql);
  }
}
