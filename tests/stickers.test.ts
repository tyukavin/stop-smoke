import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { mkdirSync, unlinkSync, existsSync } from 'fs';

const TEST_DB = 'data/test_stickers.db';

describe('Stickers service (isolated)', () => {
  let db: Database.Database;

  beforeAll(() => {
    mkdirSync('data', { recursive: true });
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
    db = new Database(TEST_DB);
    db.exec(`
      CREATE TABLE stickers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id TEXT NOT NULL,
        context TEXT DEFAULT 'any',
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  });

  afterAll(() => { db.close(); if (existsSync(TEST_DB)) unlinkSync(TEST_DB); });

  it('inserts stickers', () => {
    db.prepare('INSERT INTO stickers (file_id, context) VALUES (?, ?)').run('sticker_1', 'sos');
    db.prepare('INSERT INTO stickers (file_id, context) VALUES (?, ?)').run('sticker_2', 'victory');
    db.prepare('INSERT INTO stickers (file_id, context) VALUES (?, ?)').run('sticker_3', 'any');
    const cnt = db.prepare('SELECT COUNT(*) as cnt FROM stickers').get() as { cnt: number };
    expect(cnt.cnt).toBe(3);
  });

  it('filters by context', () => {
    const sos = db.prepare("SELECT * FROM stickers WHERE active = 1 AND (context = ? OR context = 'any')").all('sos') as any[];
    expect(sos.length).toBe(2); // sticker_1 (sos) + sticker_3 (any)
  });

  it('random selection works', () => {
    const row = db.prepare('SELECT * FROM stickers WHERE active = 1 ORDER BY RANDOM() LIMIT 1').get() as any;
    expect(row).toBeTruthy();
    expect(row.file_id).toBeTruthy();
  });

  it('inactive stickers are excluded', () => {
    db.prepare("UPDATE stickers SET active = 0 WHERE file_id = 'sticker_1'").run();
    const active = db.prepare('SELECT * FROM stickers WHERE active = 1').all() as any[];
    expect(active.length).toBe(2);
    expect(active.every((s: any) => s.file_id !== 'sticker_1')).toBe(true);
  });

  it('deleting works', () => {
    db.prepare("DELETE FROM stickers WHERE file_id = 'sticker_3'").run();
    const cnt = db.prepare('SELECT COUNT(*) as cnt FROM stickers').get() as { cnt: number };
    expect(cnt.cnt).toBe(2);
  });
});
