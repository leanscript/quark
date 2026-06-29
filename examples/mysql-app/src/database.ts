import { createMysqlDatabaseService } from '@quark/core';

export const DatabaseService = createMysqlDatabaseService({
  connection: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'quark',
    password: process.env.MYSQL_PASSWORD || 'quark',
    database: process.env.MYSQL_DATABASE || 'quark',
    waitForConnections: true,
    connectionLimit: 10,
  },
  primaryKey: 'id',
});
