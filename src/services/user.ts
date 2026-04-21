import { db } from '../db/index.js';
import type { DbUser, DeviceType } from '../types/index.js';

export function getUser(telegramId: number): DbUser | undefined {
  return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId) as DbUser | undefined;
}

export function getUserById(id: number): DbUser | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as DbUser | undefined;
}

export function createUser(telegramId: number, username?: string, firstName?: string): DbUser {
  db.prepare(
    'INSERT OR IGNORE INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)'
  ).run(telegramId, username || null, firstName || null);
  return getUser(telegramId)!;
}

export function updateUser(telegramId: number, fields: Partial<Record<string, unknown>>): void {
  const allowed = new Set([
    'device_type', 'units_per_day', 'price_per_pack', 'units_in_pack',
    'nicotine_mg', 'years_smoking', 'timezone_offset', 'motivation',
    'quit_date', 'onboarding_done', 'is_admin',
  ]);
  const entries = Object.entries(fields).filter(([k]) => allowed.has(k));
  if (!entries.length) return;
  const sets = entries.map(([k]) => `${k} = ?`).join(', ');
  const vals = entries.map(([, v]) => v);
  db.prepare(`UPDATE users SET ${sets} WHERE telegram_id = ?`).run(...vals, telegramId);
}

export function resetQuitDate(telegramId: number): void {
  db.prepare('UPDATE users SET quit_date = datetime(\'now\') WHERE telegram_id = ?').run(telegramId);
}

export function getAllActiveUsers(): DbUser[] {
  return db.prepare('SELECT * FROM users WHERE onboarding_done = 1').all() as DbUser[];
}

export function getAllUsers(): DbUser[] {
  return db.prepare('SELECT * FROM users ORDER BY id DESC').all() as DbUser[];
}

export function getUserCount(): number {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  return row.cnt;
}

export function getActiveUserCount(): number {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE onboarding_done = 1').get() as { cnt: number };
  return row.cnt;
}
