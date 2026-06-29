import { Injectable } from '@nestjs/common';
import { MysqlDriver, MysqlDriverOptions } from './drivers/mysql.driver';
import {
  PostgresqlDriver,
  PostgresqlDriverOptions,
} from './drivers/postgresql.driver';
import { SqliteDriver, SqliteDriverOptions } from './drivers/sqlite.driver';
import { SqlDatabaseService } from './sql-database.service';
import {
  SqlDatabaseServiceFactoryOptions,
  SqlDatabaseServiceOptions,
  SqlDatabaseServiceType,
} from './types';

export function createSqlDatabaseService(
  options: SqlDatabaseServiceOptions,
): SqlDatabaseServiceType {
  @Injectable()
  class ConfiguredSqlDatabaseService extends SqlDatabaseService {
    constructor() {
      super(options);
    }
  }

  return ConfiguredSqlDatabaseService;
}

export function createPostgresqlDatabaseService(
  options: PostgresqlDriverOptions & SqlDatabaseServiceFactoryOptions,
): SqlDatabaseServiceType {
  const { tableName, primaryKey, perPage, ...driverOptions } = options;

  return createSqlDatabaseService({
    driver: new PostgresqlDriver(driverOptions),
    tableName,
    primaryKey,
    perPage,
  });
}

export function createMysqlDatabaseService(
  options: MysqlDriverOptions & SqlDatabaseServiceFactoryOptions,
): SqlDatabaseServiceType {
  const { tableName, primaryKey, perPage, ...driverOptions } = options;

  return createSqlDatabaseService({
    driver: new MysqlDriver(driverOptions),
    tableName,
    primaryKey,
    perPage,
  });
}

export function createSqliteDatabaseService(
  options: SqliteDriverOptions & SqlDatabaseServiceFactoryOptions,
): SqlDatabaseServiceType {
  const { tableName, primaryKey, perPage, ...driverOptions } = options;

  return createSqlDatabaseService({
    driver: new SqliteDriver(driverOptions),
    tableName,
    primaryKey,
    perPage,
  });
}
