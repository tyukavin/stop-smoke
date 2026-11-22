import Database from 'better-sqlite3';
import { config } from '../config.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

mkdirSync(dirname(config.dbPath), { recursive: true });

export const db: Database.Database = new Database(config.dbPath);
db.pragma('busy_timeout = 5000');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  // Detect old Python schema and drop it
  const cols = db.prepare("PRAGMA table_info('users')").all() as { name: string }[];
  const colNames = cols.map(c => c.name);
  if (colNames.length > 0 && !colNames.includes('telegram_id')) {
    console.log('Detected old schema, recreating database...');
    for (const t of ['content_deliveries', 'daily_checkins', 'mood_logs', 'user_achievements', 'cravings', 'materials', 'content', 'users']) {
      db.exec(`DROP TABLE IF EXISTS ${t}`);
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id     INTEGER UNIQUE NOT NULL,
      username        TEXT,
      first_name      TEXT,
      device_type     TEXT DEFAULT 'cigarettes' CHECK(device_type IN ('cigarettes','iqos','vape','mini_vape')),
      units_per_day   INTEGER DEFAULT 20,
      price_per_pack  REAL DEFAULT 250,
      units_in_pack   INTEGER DEFAULT 20,
      nicotine_mg     REAL DEFAULT 0,
      years_smoking   INTEGER DEFAULT 5,
      timezone_offset INTEGER DEFAULT 3,
      motivation      TEXT DEFAULT '',
      quit_date       TEXT,
      onboarding_done INTEGER DEFAULT 0,
      is_admin        INTEGER DEFAULT 0,
      goal_title      TEXT DEFAULT '',
      goal_amount     REAL DEFAULT 0,
      notifications_enabled INTEGER DEFAULT 1,
      created_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cravings (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      intensity  INTEGER DEFAULT 5,
      trigger_type TEXT DEFAULT '',
      resisted   INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      code        TEXT NOT NULL,
      unlocked_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, code)
    );

    CREATE TABLE IF NOT EXISTS mood_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      mood       INTEGER DEFAULT 3,
      note       TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_checkins (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      smoke_free INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS content (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      type       TEXT NOT NULL,
      category   TEXT DEFAULT '',
      text       TEXT NOT NULL,
      active     INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS content_deliveries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      content_id INTEGER NOT NULL REFERENCES content(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, content_id)
    );

    CREATE TABLE IF NOT EXISTS materials (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      url         TEXT NOT NULL,
      description TEXT DEFAULT '',
      category    TEXT DEFAULT 'general',
      sort_order  INTEGER DEFAULT 0,
      active      INTEGER DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stickers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id    TEXT NOT NULL,
      context    TEXT DEFAULT 'any',
      active     INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admins (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      login         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name          TEXT DEFAULT '',
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bot_config (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL DEFAULT '',
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_missions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id),
      day_number   INTEGER NOT NULL,
      completed_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, day_number)
    );

    CREATE TABLE IF NOT EXISTS health_notifications (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id           INTEGER NOT NULL REFERENCES users(id),
      milestone_minutes INTEGER NOT NULL,
      sent_at           TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, milestone_minutes)
    );
  `);

  // Safe incremental column migrations for existing databases
  const updatedCols = (db.prepare("PRAGMA table_info('users')").all() as { name: string }[]).map((c) => c.name);
  if (!updatedCols.includes('goal_title')) {
    db.exec("ALTER TABLE users ADD COLUMN goal_title TEXT DEFAULT ''");
  }
  if (!updatedCols.includes('goal_amount')) {
    db.exec('ALTER TABLE users ADD COLUMN goal_amount REAL DEFAULT 0');
  }
  if (!updatedCols.includes('notifications_enabled')) {
    db.exec('ALTER TABLE users ADD COLUMN notifications_enabled INTEGER DEFAULT 1');
  }
}
