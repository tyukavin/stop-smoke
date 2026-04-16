import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { mkdirSync, unlinkSync, existsSync } from 'fs';
import { ACHIEVEMENTS } from '../src/services/achievements.js';

const TEST_DB_PATH = 'data/test_ach.db';

describe('Achievements', () => {
  let db: Database.Database;

  beforeAll(() => {
    mkdirSync('data', { recursive: true });
    if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);
    db = new Database(TEST_DB_PATH);
    db.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY, telegram_id INTEGER UNIQUE, onboarding_done INTEGER DEFAULT 1);
      CREATE TABLE user_achievements (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, code TEXT, unlocked_at TEXT DEFAULT (datetime('now')), UNIQUE(user_id, code));
      CREATE TABLE cravings (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, intensity INTEGER DEFAULT 5, trigger_type TEXT DEFAULT '', resisted INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE daily_checkins (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, smoke_free INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')));
    `);
    db.prepare('INSERT INTO users (id, telegram_id) VALUES (1, 12345)').run();
  });

  afterAll(() => {
    db.close();
    if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);
  });

  it('has 18 achievements defined', () => {
    expect(ACHIEVEMENTS.length).toBe(18);
  });

  it('has unique codes', () => {
    const codes = ACHIEVEMENTS.map(a => a.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('time-based achievements are sorted by conditionDays', () => {
    const timeBased = ACHIEVEMENTS.filter(a => a.conditionDays !== undefined);
    for (let i = 1; i < timeBased.length; i++) {
      expect(timeBased[i].conditionDays!).toBeGreaterThanOrEqual(timeBased[i - 1].conditionDays!);
    }
  });

  it('unlocking is idempotent (UNIQUE constraint)', () => {
    db.prepare('INSERT INTO user_achievements (user_id, code) VALUES (1, \'test_ach\')').run();
    // Second insert should be ignored
    const fn = () => db.prepare('INSERT OR IGNORE INTO user_achievements (user_id, code) VALUES (1, \'test_ach\')').run();
    expect(fn).not.toThrow();

    const count = db.prepare('SELECT COUNT(*) as cnt FROM user_achievements WHERE user_id = 1 AND code = \'test_ach\'').get() as { cnt: number };
    expect(count.cnt).toBe(1);
  });
});
