import { db } from '../db/index.js';
import type { DbMaterial } from '../types/index.js';

export function getMaterials(category?: string): DbMaterial[] {
  if (category) {
    return db.prepare('SELECT * FROM materials WHERE active = 1 AND category = ? ORDER BY sort_order, id').all(category) as DbMaterial[];
  }
  return db.prepare('SELECT * FROM materials WHERE active = 1 ORDER BY sort_order, id').all() as DbMaterial[];
}

export function getAllMaterials(): DbMaterial[] {
  return db.prepare('SELECT * FROM materials ORDER BY sort_order, id').all() as DbMaterial[];
}

export function addMaterial(title: string, url: string, description = '', category = 'general'): number {
  const r = db.prepare(
    'INSERT INTO materials (title, url, description, category) VALUES (?, ?, ?, ?)'
  ).run(title, url, description, category);
  return Number(r.lastInsertRowid);
}

export function updateMaterial(id: number, fields: Partial<{ title: string; url: string; description: string; category: string; active: boolean; sort_order: number }>): void {
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    const col = k === 'sort_order' ? 'sort_order' : k;
    sets.push(`${col} = ?`);
    vals.push(typeof v === 'boolean' ? (v ? 1 : 0) : v);
  }
  if (!sets.length) return;
  vals.push(id);
  db.prepare(`UPDATE materials SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
}

export function deleteMaterial(id: number): void {
  db.prepare('DELETE FROM materials WHERE id = ?').run(id);
}

export const MATERIAL_CATEGORIES = [
  { key: 'general', label: '📚 Общее' },
  { key: 'video', label: '🎬 Видео' },
  { key: 'article', label: '📰 Статьи' },
  { key: 'book', label: '📖 Книги' },
  { key: 'app', label: '📱 Приложения' },
  { key: 'community', label: '👥 Сообщества' },
];
