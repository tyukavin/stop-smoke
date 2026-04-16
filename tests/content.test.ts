import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { mkdirSync, unlinkSync, existsSync } from 'fs';

const TEST_DB_PATH = 'data/test_content.db';

// We test the content service logic in isolation using a separate DB
describe('Content Service (isolated)', () => {
  let db: Database.Database;

  beforeAll(() => {
    mkdirSync('data', { recursive: true });
    if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);
    db = new Database(TEST_DB_PATH);
    db.pragma('journal_mode = WAL');

    db.exec(`
      CREATE TABLE IF NOT EXISTS content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        category TEXT DEFAULT '',
        text TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS content_deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content_id INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, content_id)
      );
    `);
  });

  afterAll(() => {
    db.close();
    if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);
  });

  it('inserts content and retrieves it', () => {
    db.prepare('INSERT INTO content (type, text) VALUES (?, ?)').run('motivation', 'Test quote 1');
    db.prepare('INSERT INTO content (type, text) VALUES (?, ?)').run('motivation', 'Test quote 2');
    db.prepare('INSERT INTO content (type, text) VALUES (?, ?)').run('motivation', 'Test quote 3');

    const count = db.prepare('SELECT COUNT(*) as cnt FROM content WHERE type = ?').get('motivation') as { cnt: number };
    expect(count.cnt).toBe(3);
  });

  it('avoids repeats by tracking deliveries', () => {
    const userId = 999;
    const delivered = new Set<number>();

    for (let i = 0; i < 3; i++) {
      const row = db.prepare(
        `SELECT * FROM content WHERE type = 'motivation' AND active = 1 AND id NOT IN (SELECT content_id FROM content_deliveries WHERE user_id = ?) ORDER BY RANDOM() LIMIT 1`
      ).get(userId) as any;

      expect(row).toBeTruthy();
      expect(delivered.has(row.id)).toBe(false);
      delivered.add(row.id);

      db.prepare('INSERT OR IGNORE INTO content_deliveries (user_id, content_id) VALUES (?, ?)').run(userId, row.id);
    }

    expect(delivered.size).toBe(3);

    // All delivered — next query should return nothing
    const row = db.prepare(
      `SELECT * FROM content WHERE type = 'motivation' AND active = 1 AND id NOT IN (SELECT content_id FROM content_deliveries WHERE user_id = ?) LIMIT 1`
    ).get(userId) as any;
    expect(row).toBeUndefined();
  });

  it('respects category filtering', () => {
    db.prepare('INSERT INTO content (type, category, text) VALUES (?, ?, ?)').run('myth', 'stress', 'Stress myth');
    db.prepare('INSERT INTO content (type, category, text) VALUES (?, ?, ?)').run('myth', 'weight', 'Weight myth');

    const stress = db.prepare('SELECT * FROM content WHERE type = ? AND category = ?').all('myth', 'stress') as any[];
    expect(stress.length).toBe(1);
    expect(stress[0].text).toBe('Stress myth');
  });

  it('deactivating content excludes it from queries', () => {
    db.prepare('INSERT INTO content (type, text, active) VALUES (?, ?, ?)').run('test', 'Active item', 1);
    db.prepare('INSERT INTO content (type, text, active) VALUES (?, ?, ?)').run('test', 'Inactive item', 0);

    const active = db.prepare('SELECT * FROM content WHERE type = ? AND active = 1').all('test') as any[];
    expect(active.length).toBe(1);
    expect(active[0].text).toBe('Active item');
  });
});
