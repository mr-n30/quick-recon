import Database from "better-sqlite3";

import { config } from "./config.js";

export const db = new Database(config.databasePath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    target_raw TEXT NOT NULL,
    normalized_target TEXT NOT NULL,
    status TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    log_path TEXT NOT NULL,
    last_error TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_scans_user_created ON scans(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_scans_user_status ON scans(user_id, status);
`);

db.prepare(
  `
    UPDATE scans
    SET
      status = 'failed',
      last_error = COALESCE(last_error, 'Server restarted before scan completed.'),
      finished_at = COALESCE(finished_at, ?)
    WHERE status IN ('queued', 'running')
  `,
).run(new Date().toISOString());
