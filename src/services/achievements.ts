import { db } from '../db/index.js';
import type { DbUser } from '../types/index.js';
import { calcProgress } from './progress.js';
import { getCravingStats, getCheckinCount } from './craving.js';

export interface Achievement {
  code: string;
  title: string;
  description: string;
  emoji: string;
  conditionDays?: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { code: 'hour_1', title: 'Первый час свободы', description: 'Маленькое Чудовище уже нервничает.', emoji: '⏰', conditionDays: 1/24 },
  { code: 'half_day', title: 'Полдня на свободе', description: 'Никотин покидает организм. Чудовище голодает!', emoji: '☀️', conditionDays: 0.5 },
  { code: 'day_1', title: 'Первый день', description: 'Ты уже чувствуешь себя лучше, чем вчера.', emoji: '🌟', conditionDays: 1 },
  { code: 'day_3', title: 'Чудовище мертво', description: 'Никотин полностью вышел! Маленькое Чудовище сдохло.', emoji: '💀', conditionDays: 3 },
  { code: 'week_1', title: 'Неделя свободы', description: 'Вкус и запахи ярче. Это нормальная жизнь.', emoji: '🏆', conditionDays: 7 },
  { code: 'week_2', title: 'Две недели', description: 'Привычные ситуации уже не вызывают мыслей о никотине.', emoji: '🔓', conditionDays: 14 },
  { code: 'month_1', title: 'Месяц свободы', description: 'Лёгкие восстанавливаются. Ты дышишь полной грудью!', emoji: '🍃', conditionDays: 30 },
  { code: 'month_3', title: 'Три месяца', description: 'Ёмкость лёгких выросла на 30%. Свободный человек.', emoji: '🌊', conditionDays: 90 },
  { code: 'month_6', title: 'Полгода свободы', description: 'Одышка в прошлом. Энергии больше, чем когда-либо!', emoji: '⚡', conditionDays: 180 },
  { code: 'year_1', title: 'Год свободы!', description: 'Риск сердечных заболеваний упал вдвое. Легенда.', emoji: '🎉', conditionDays: 365 },
  { code: 'cravings_5', title: 'Охотник на Чудовище', description: '5 атак отбито! Чудовище слабеет.', emoji: '🛡️' },
  { code: 'cravings_25', title: 'Мастер свободы', description: '25 атак! Ты видишь уловки насквозь.', emoji: '⚔️' },
  { code: 'cravings_100', title: 'Непобедимый', description: '100 атак отбито! Чудовищу нечем удивить.', emoji: '🔥' },
  { code: 'money_1000', title: 'Первая тысяча', description: '1 000₽ не ушли табачным компаниям!', emoji: '💰' },
  { code: 'money_5000', title: 'Пять тысяч', description: '5 000₽ остались в кармане. Побалуй себя!', emoji: '💎' },
  { code: 'money_10000', title: 'Десять тысяч', description: '10 000₽! Табачная индустрия плачет.', emoji: '🏦' },
  { code: 'checkin_7', title: 'Неделя осознанности', description: '7 чекинов! Свобода — привычка.', emoji: '📝' },
  { code: 'checkin_30', title: 'Свободный месяц', description: '30 чекинов! Полноценный свободный человек.', emoji: '📅' },
];

const ACH_MAP = new Map(ACHIEVEMENTS.map(a => [a.code, a]));

export function getAchievement(code: string): Achievement | undefined {
  return ACH_MAP.get(code);
}

export function getUserAchievements(userId: number): string[] {
  const rows = db.prepare('SELECT code FROM user_achievements WHERE user_id = ?').all(userId) as { code: string }[];
  return rows.map(r => r.code);
}

function unlock(userId: number, code: string): boolean {
  try {
    db.prepare('INSERT OR IGNORE INTO user_achievements (user_id, code) VALUES (?, ?)').run(userId, code);
    return true;
  } catch { return false; }
}

export function checkAndUnlock(user: DbUser): string[] {
  const existing = new Set(getUserAchievements(user.id));
  const progress = calcProgress(user);
  const stats = getCravingStats(user.id);
  const checkins = getCheckinCount(user.id);
  const newlyUnlocked: string[] = [];

  for (const ach of ACHIEVEMENTS) {
    if (existing.has(ach.code)) continue;

    if (ach.conditionDays !== undefined) {
      if (progress.smokeFreeDays >= ach.conditionDays) {
        unlock(user.id, ach.code);
        newlyUnlocked.push(ach.code);
      }
      continue;
    }

    if (ach.code.startsWith('cravings_')) {
      const threshold = parseInt(ach.code.split('_')[1]);
      if (stats.resisted >= threshold) { unlock(user.id, ach.code); newlyUnlocked.push(ach.code); }
    } else if (ach.code.startsWith('money_')) {
      const threshold = parseInt(ach.code.split('_')[1]);
      if (progress.moneySaved >= threshold) { unlock(user.id, ach.code); newlyUnlocked.push(ach.code); }
    } else if (ach.code.startsWith('checkin_')) {
      const threshold = parseInt(ach.code.split('_')[1]);
      if (checkins >= threshold) { unlock(user.id, ach.code); newlyUnlocked.push(ach.code); }
    }
  }

  return newlyUnlocked;
}

export function formatAchievement(code: string): string {
  const a = ACH_MAP.get(code);
  if (!a) return '';
  return `${a.emoji} <b>${a.title}</b>\n${a.description}`;
}
