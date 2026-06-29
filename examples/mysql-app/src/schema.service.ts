import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { createPool } from 'mysql2/promise';
import { mysqlConnection } from './database';

@Injectable()
export class SchemaService implements OnApplicationBootstrap {
  async onApplicationBootstrap(): Promise<void> {
    const pool = createPool({ ...mysqlConnection, multipleStatements: true });

    try {
      await pool.query(schemaSql);
    } finally {
      await pool.end();
    }
  }
}

const schemaSql = `
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  bio VARCHAR(255) NOT NULL,
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(120) NOT NULL,
  body TEXT NOT NULL,
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  internal_code VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

INSERT IGNORE INTO users (id, name, email) VALUES
  (1, 'Ada Lovelace', 'ada@example.com'),
  (2, 'Grace Hopper', 'grace@example.com');

INSERT IGNORE INTO profiles (id, user_id, bio) VALUES
  (1, 1, 'Wrote the first published computer program.'),
  (2, 2, 'Popularized machine-independent programming languages.');

INSERT IGNORE INTO posts (id, user_id, title, body) VALUES
  (1, 1, 'Notes on the Analytical Engine', 'Long-form private draft.'),
  (2, 1, 'Loops before loops', 'Implementation notes.'),
  (3, 2, 'Debugging the Mark II', 'Incident report.');

INSERT IGNORE INTO roles (id, name, internal_code) VALUES
  (1, 'admin', 'ROLE_ADMIN_PRIVATE'),
  (2, 'author', 'ROLE_AUTHOR_PRIVATE');

INSERT IGNORE INTO user_roles (user_id, role_id) VALUES
  (1, 1),
  (1, 2),
  (2, 2);
`;
