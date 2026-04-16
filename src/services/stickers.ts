import { db } from '../db/index.js';

export interface DbSticker {
  id: number;
  file_id: string;
  context: string;
  active: number;
  created_at: string;
}

export function getRandomSticker(context?: string): DbSticker | null {
  if (context && context !== 'any') {
    const row = db.prepare(
      `SELECT * FROM stickers WHERE active = 1 AND (context = ? OR context = 'any') ORDER BY RANDOM() LIMIT 1`
    ).get(context) as DbSticker | undefined;
    if (row) return row;
  }
  return (db.prepare('SELECT * FROM stickers WHERE active = 1 ORDER BY RANDOM() LIMIT 1').get() as DbSticker) ?? null;
}

export function getAllStickers(): DbSticker[] {
  return db.prepare('SELECT * FROM stickers ORDER BY id DESC').all() as DbSticker[];
}

export function addSticker(fileId: string, context = 'any'): number {
  const r = db.prepare('INSERT INTO stickers (file_id, context) VALUES (?, ?)').run(fileId, context);
  return Number(r.lastInsertRowid);
}

export function updateSticker(id: number, fields: { context?: string; active?: boolean }): void {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (fields.context !== undefined) { sets.push('context = ?'); vals.push(fields.context); }
  if (fields.active !== undefined) { sets.push('active = ?'); vals.push(fields.active ? 1 : 0); }
  if (!sets.length) return;
  vals.push(id);
  db.prepare(`UPDATE stickers SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
}

export function deleteSticker(id: number): void {
  db.prepare('DELETE FROM stickers WHERE id = ?').run(id);
}

export function getStickerCount(): number {
  const r = db.prepare('SELECT COUNT(*) as cnt FROM stickers WHERE active = 1').get() as { cnt: number };
  return r.cnt;
}

export const STICKER_CONTEXTS = [
  { key: 'any', label: 'Любой контекст' },
  { key: 'sos', label: 'SOS / тяга' },
  { key: 'victory', label: 'Победа / достижение' },
  { key: 'motivation', label: 'Мотивация' },
  { key: 'checkin', label: 'Чекин' },
  { key: 'relapse', label: 'Срыв' },
  { key: 'funny', label: 'Просто мем' },
];
