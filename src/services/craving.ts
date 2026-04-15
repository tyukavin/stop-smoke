import { db } from '../db/index.js';
import type { CravingStats } from '../types/index.js';

export function logCraving(userId: number, intensity: number, trigger: string, resisted: boolean): number {
  const r = db.prepare(
    'INSERT INTO cravings (user_id, intensity, trigger_type, resisted) VALUES (?, ?, ?, ?)'
  ).run(userId, intensity, trigger, resisted ? 1 : 0);
  return Number(r.lastInsertRowid);
}

export function getCravingStats(userId: number): CravingStats {
  const row = db.prepare(`
    SELECT COUNT(*) as total, COALESCE(SUM(resisted), 0) as resisted, COALESCE(AVG(intensity), 0) as avg_i
    FROM cravings WHERE user_id = ?
  `).get(userId) as { total: number; resisted: number; avg_i: number };
  return { total: row.total, resisted: row.resisted, avgIntensity: Math.round(row.avg_i * 10) / 10 };
}

export function logCheckin(userId: number, smokeFree: boolean): void {
  db.prepare('INSERT INTO daily_checkins (user_id, smoke_free) VALUES (?, ?)').run(userId, smokeFree ? 1 : 0);
}

export function getCheckinCount(userId: number): number {
  const r = db.prepare('SELECT COUNT(*) as cnt FROM daily_checkins WHERE user_id = ?').get(userId) as { cnt: number };
  return r.cnt;
}

export function logMood(userId: number, mood: number, note = ''): void {
  db.prepare('INSERT INTO mood_logs (user_id, mood, note) VALUES (?, ?, ?)').run(userId, mood, note);
}
