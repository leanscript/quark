import Database from 'better-sqlite3';
import { createSqliteDatabaseService } from '@quark/core';

export const sqlite = new Database(':memory:');

sqlite.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL
  );

  CREATE TABLE profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    bio TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    internal_code TEXT NOT NULL
  );

  CREATE TABLE user_roles (
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
  );

  INSERT INTO users (id, name, email) VALUES
    (1, 'Ada Lovelace', 'ada@example.com'),
    (2, 'Grace Hopper', 'grace@example.com');

  INSERT INTO profiles (id, user_id, bio) VALUES
    (1, 1, 'Wrote the first published computer program.'),
    (2, 2, 'Popularized machine-independent programming languages.');

  INSERT INTO posts (id, user_id, title, body) VALUES
    (1, 1, 'Notes on the Analytical Engine', 'Long-form private draft.'),
    (2, 1, 'Loops before loops', 'Implementation notes.'),
    (3, 2, 'Debugging the Mark II', 'Incident report.');

  INSERT INTO roles (id, name, internal_code) VALUES
    (1, 'admin', 'ROLE_ADMIN_PRIVATE'),
    (2, 'author', 'ROLE_AUTHOR_PRIVATE');

  INSERT INTO user_roles (user_id, role_id) VALUES
    (1, 1),
    (1, 2),
    (2, 2);
`);

export const DatabaseService = createSqliteDatabaseService({
  database: sqlite,
  primaryKey: 'id',
});
