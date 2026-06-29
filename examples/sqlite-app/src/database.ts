import Database from 'better-sqlite3';
import { createSqliteDatabaseService } from '@quark/core';

export const sqlite = new Database(':memory:');

sqlite.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL
  );

  INSERT INTO users (name, email) VALUES
    ('Ada Lovelace', 'ada@example.com'),
    ('Grace Hopper', 'grace@example.com');
`);

export const DatabaseService = createSqliteDatabaseService({
  database: sqlite,
  primaryKey: 'id',
});
