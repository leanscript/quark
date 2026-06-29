import { Type } from '@nestjs/common';
import { DatabaseServiceInterface } from '../../interfaces';

export type SqlDialect = 'mysql' | 'postgresql' | 'sqlite';
export type SqlParameter = string | number | boolean | bigint | Date | null;

export interface SqlQueryResult<Row = any> {
  rows: Row[];
  affectedRows?: number;
  insertId?: string | number | bigint;
}

export interface SqlDriver {
  readonly dialect: SqlDialect;
  query<Row = any>(
    sql: string,
    params?: SqlParameter[],
  ): Promise<SqlQueryResult<Row>>;
  close?(): Promise<void> | void;
  quoteIdentifier(identifier: string): string;
}

export type TableNameResolver = (target: string) => string;
export type PrimaryKeyResolver = string | ((target: string) => string);

export interface SqlDatabaseServiceOptions {
  driver: SqlDriver;
  tableName?: TableNameResolver;
  primaryKey?: PrimaryKeyResolver;
  perPage?: number;
}

export type SqlDatabaseServiceFactoryOptions = Omit<
  SqlDatabaseServiceOptions,
  'driver'
>;

export type SqlDatabaseServiceType = Type<DatabaseServiceInterface>;
