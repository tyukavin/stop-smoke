import { db } from '../db/index.js';
import type { DbContent } from '../types/index.js';

/**
 * Get content avoiding repeats for a user.
 * Falls back to random if all have been delivered.
 */
export function getContentForUser(userId: number, type: string, category?: string): DbContent | null {
  const catClause = category ? 'AND c.category = ?' : '';
  const params: unknown[] = category ? [type, category, userId] : [type, userId];

  let row = db.prepare(`
    SELECT c.* FROM content c
    WHERE c.type = ? AND c.active = 1 ${catClause}
      AND c.id NOT IN (SELECT content_id FROM content_deliveries WHERE user_id = ?)
    ORDER BY RANDOM() LIMIT 1
  `).get(...params) as DbContent | undefined;

  if (!row) {
    db.prepare(`
      DELETE FROM content_deliveries WHERE user_id = ? AND content_id IN (
        SELECT id FROM content WHERE type = ? ${category ? 'AND category = ?' : ''} AND active = 1
      )
    `).run(userId, type, ...(category ? [category] : []));

    row = db.prepare(`
      SELECT c.* FROM content c
      WHERE c.type = ? AND c.active = 1 ${catClause}
      ORDER BY RANDOM() LIMIT 1
    `).get(type, ...(category ? [category] : [])) as DbContent | undefined;
  }

  if (row) {
    db.prepare(
      'INSERT OR IGNORE INTO content_deliveries (user_id, content_id) VALUES (?, ?)'
    ).run(userId, row.id);
  }

  return row ?? null;
}

export function getRandomContent(type: string, category?: string): DbContent | null {
  const catClause = category ? 'AND category = ?' : '';
  const params: unknown[] = category ? [type, category] : [type];
  return (db.prepare(
    `SELECT * FROM content WHERE type = ? AND active = 1 ${catClause} ORDER BY RANDOM() LIMIT 1`
  ).get(...params) as DbContent) ?? null;
}

export function getAllContent(type?: string): DbContent[] {
  if (type) {
    return db.prepare('SELECT * FROM content WHERE type = ? ORDER BY id DESC').all(type) as DbContent[];
  }
  return db.prepare('SELECT * FROM content ORDER BY type, id DESC').all() as DbContent[];
}

export function addContent(type: string, text: string, category = ''): number {
  const result = db.prepare(
    'INSERT INTO content (type, category, text) VALUES (?, ?, ?)'
  ).run(type, category, text);
  return Number(result.lastInsertRowid);
}

export function updateContent(
  id: number,
  fields: { text?: string; active?: boolean; category?: string; type?: string }
): void {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (fields.type !== undefined) { sets.push('type = ?'); vals.push(fields.type); }
  if (fields.text !== undefined) { sets.push('text = ?'); vals.push(fields.text); }
  if (fields.active !== undefined) { sets.push('active = ?'); vals.push(fields.active ? 1 : 0); }
  if (fields.category !== undefined) { sets.push('category = ?'); vals.push(fields.category); }
  if (!sets.length) return;
  vals.push(id);
  db.prepare(`UPDATE content SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
}

export function deleteContent(id: number): void {
  db.prepare('DELETE FROM content_deliveries WHERE content_id = ?').run(id);
  db.prepare('DELETE FROM content WHERE id = ?').run(id);
}

export function getContentCount(type?: string): number {
  if (type) {
    const r = db.prepare('SELECT COUNT(*) as cnt FROM content WHERE type = ? AND active = 1').get(type) as { cnt: number };
    return r.cnt;
  }
  const r = db.prepare('SELECT COUNT(*) as cnt FROM content WHERE active = 1').get() as { cnt: number };
  return r.cnt;
}
