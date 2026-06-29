import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Pool } from 'pg';
import { postgresConnection } from './database';

@Injectable()
export class SchemaService implements OnApplicationBootstrap {
  async onApplicationBootstrap(): Promise<void> {
    const pool = new Pool(postgresConnection);

    try {
      await pool.query(schemaSql);
    } finally {
      await pool.end();
    }
  }
}

const schemaSql = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id),
  bio VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  title VARCHAR(120) NOT NULL,
  body TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  internal_code VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INT NOT NULL REFERENCES users(id),
  role_id INT NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

INSERT INTO users (id, name, email) VALUES
  (1, 'Ada Lovelace', 'ada@example.com'),
  (2, 'Grace Hopper', 'grace@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, user_id, bio) VALUES
  (1, 1, 'Wrote the first published computer program.'),
  (2, 2, 'Popularized machine-independent programming languages.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO posts (id, user_id, title, body) VALUES
  (1, 1, 'Notes on the Analytical Engine', 'Long-form private draft.'),
  (2, 1, 'Loops before loops', 'Implementation notes.'),
  (3, 2, 'Debugging the Mark II', 'Incident report.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO roles (id, name, internal_code) VALUES
  (1, 'admin', 'ROLE_ADMIN_PRIVATE'),
  (2, 'author', 'ROLE_AUTHOR_PRIVATE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id) VALUES
  (1, 1),
  (1, 2),
  (2, 2)
ON CONFLICT (user_id, role_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('profiles', 'id'), (SELECT MAX(id) FROM profiles));
SELECT setval(pg_get_serial_sequence('posts', 'id'), (SELECT MAX(id) FROM posts));
SELECT setval(pg_get_serial_sequence('roles', 'id'), (SELECT MAX(id) FROM roles));
`;
