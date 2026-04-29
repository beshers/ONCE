import mysql from "mysql2/promise";
import { env } from "../lib/env";
import { getMysqlConnectionOptions } from "./mysql-config";

let schemaReady: Promise<void> | undefined;

const userColumns = [
  ["username", "VARCHAR(50) NULL AFTER id"],
  ["password_hash", "VARCHAR(255) NULL AFTER email"],
  ["full_name", "VARCHAR(100) NULL AFTER password_hash"],
  ["first_name", "VARCHAR(50) NULL AFTER full_name"],
  ["last_name", "VARCHAR(50) NULL AFTER first_name"],
  ["avatar", "VARCHAR(255) NULL AFTER last_name"],
  ["bio", "TEXT NULL AFTER avatar"],
  ["programming_languages", "TEXT NULL AFTER bio"],
  ["role", "ENUM('user','admin') NOT NULL DEFAULT 'user' AFTER programming_languages"],
  ["status", "ENUM('online','offline','away','busy') NOT NULL DEFAULT 'offline' AFTER role"],
  ["is_online", "TINYINT(1) NOT NULL DEFAULT 0 AFTER status"],
  ["last_seen", "TIMESTAMP NULL DEFAULT NULL AFTER is_online"],
  ["created_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER last_seen"],
  [
    "updated_at",
    "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at",
  ],
  ["last_login_at", "TIMESTAMP NULL DEFAULT NULL AFTER updated_at"],
] as const;

async function ensureColumn(connection: mysql.Connection, column: string, definition: string) {
  const [rows] = await connection.execute<mysql.RowDataPacket[]>(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND column_name = ?
    `,
    [column],
  );

  if (Number(rows[0]?.count ?? 0) === 0) {
    await connection.query(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
  }
}

async function ensureUsersSchema() {
  if (!env.databaseUrl) {
    return;
  }

  const connection = await mysql.createConnection(getMysqlConnectionOptions(env.databaseUrl));
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) NOT NULL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        UNIQUE KEY users_email_unique (email)
      )
    `);

    for (const [column, definition] of userColumns) {
      await ensureColumn(connection, column, definition);
    }

    await connection.query(`
      UPDATE users
      SET username = COALESCE(NULLIF(username, ''), REPLACE(SUBSTRING_INDEX(COALESCE(email, id), '@', 1), '.', '_'))
      WHERE username IS NULL OR username = ''
    `);
    await connection.query(`
      UPDATE users
      SET full_name = COALESCE(
        NULLIF(full_name, ''),
        NULLIF(TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))), ''),
        username,
        email,
        id
      )
      WHERE full_name IS NULL OR full_name = ''
    `);
    await connection.query("ALTER TABLE users MODIFY username VARCHAR(50) NOT NULL");
    await connection.query("ALTER TABLE users MODIFY full_name VARCHAR(100) NOT NULL");
  } finally {
    await connection.end();
  }
}

export function ensureDatabaseSchema() {
  schemaReady ??= ensureUsersSchema();
  return schemaReady;
}
