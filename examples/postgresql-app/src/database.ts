import { createPostgresqlDatabaseService } from '@quark/core';

export const postgresConnection = {
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || 'quark',
  password: process.env.POSTGRES_PASSWORD || 'quark',
  database: process.env.POSTGRES_DATABASE || 'quark',
  max: 10,
};

export const DatabaseService = createPostgresqlDatabaseService({
  connection: postgresConnection,
  primaryKey: 'id',
});
