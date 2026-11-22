import { db } from '../db/index.js';

export interface HealthMilestone {
  minutes: number;
  title: string;
  text: string;
  emoji: string;
  /** Whether to proactively notify user when crossed. */
  notify?: boolean;
}

export const HEALTH_MILESTONES: HealthMilestone[] = [
  { minutes: 20, title: '20 минут', text: 'Пульс и давление нормализуются.', emoji: '❤️', notify: true },
  { minutes: 480, title: '8 часов', text: 'Угарный газ в крови ↓ вдвое. Кислород в норме.', emoji: '🩸', notify: true },
  { minutes: 720, title: '12 часов', text: 'Угарный газ полностью выведен.', emoji: '💨' },
  { minutes: 1440, title: '24 часа', text: 'Риск сердечного приступа начал снижаться.', emoji: '💓', notify: true },
  { minutes: 2880, title: '48 часов', text: 'Вкус и обоняние становятся ярче.', emoji: '👃', notify: true },
  { minutes: 4320, title: '72 часа', text: 'Бронхи расслабляются. Никотин вышел полностью!', emoji: '🌿', notify: true },
  { minutes: 10080, title: '7 дней', text: 'Физическая ломка позади. Дыхание заметно свежее.', emoji: '🌬️', notify: true },
  { minutes: 14400, title: '10 дней', text: 'Кровообращение в дёснах нормализуется.', emoji: '🦷' },
  { minutes: 20160, title: '2 недели', text: 'Кровообращение значительно улучшилось.', emoji: '🚶', notify: true },
  { minutes: 43200, title: '1 месяц', text: 'Кашель и одышка уменьшаются.', emoji: '🍃', notify: true },
  { minutes: 129600, title: '3 месяца', text: 'Объём лёгких +30%.', emoji: '🏃', notify: true },
  { minutes: 259200, title: '6 месяцев', text: 'Хронический кашель прошёл.', emoji: '🌻', notify: true },
  { minutes: 525600, title: '1 год', text: 'Риск ишемической болезни ↓ вдвое!', emoji: '🎉', notify: true },
  { minutes: 2628000, title: '5 лет', text: 'Риск инсульта как у некурящего.', emoji: '🧠', notify: true },
  { minutes: 5256000, title: '10 лет', text: 'Риск рака лёгких ↓ вдвое.', emoji: '🌟', notify: true },
  { minutes: 7884000, title: '15 лет', text: 'Сердце как у никогда не курившего!', emoji: '💖', notify: true },
];

export interface NextMilestoneInfo {
  milestone: HealthMilestone;
  remainingMinutes: number;
  progressFraction: number;
}

export function getNextHealthMilestone(smokeFreeMinutes: number): NextMilestoneInfo | null {
  let prevMinutes = 0;
  for (const m of HEALTH_MILESTONES) {
    if (smokeFreeMinutes < m.minutes) {
      const span = Math.max(1, m.minutes - prevMinutes);
      const done = Math.max(0, smokeFreeMinutes - prevMinutes);
      return {
        milestone: m,
        remainingMinutes: m.minutes - smokeFreeMinutes,
        progressFraction: Math.min(1, done / span),
      };
    }
    prevMinutes = m.minutes;
  }
  return null;
}

export function formatRemainingTime(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.ceil(minutes))} мин.`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)} ч.`;
  return `${Math.ceil(minutes / 1440)} дн.`;
}

export function getNotifiedMilestones(userId: number): Set<number> {
  const rows = db
    .prepare('SELECT milestone_minutes FROM health_notifications WHERE user_id = ?')
    .all(userId) as { milestone_minutes: number }[];
  return new Set(rows.map((r) => r.milestone_minutes));
}

export function markMilestoneNotified(userId: number, milestoneMinutes: number): void {
  db.prepare(
    'INSERT OR IGNORE INTO health_notifications (user_id, milestone_minutes) VALUES (?, ?)'
  ).run(userId, milestoneMinutes);
}

/**
 * Returns the latest newly-reached notifiable milestone for the user,
 * marking all reached milestones as notified so a user with a 30-day streak
 * doesn't get spammed with 8 notifications at once.
 */
export function popLatestNewlyReachedMilestone(
  userId: number,
  smokeFreeMinutes: number
): HealthMilestone | null {
  const notified = getNotifiedMilestones(userId);
  const newlyReached = HEALTH_MILESTONES.filter(
    (m) => m.notify && smokeFreeMinutes >= m.minutes && !notified.has(m.minutes)
  );
  if (!newlyReached.length) return null;

  for (const m of newlyReached) {
    markMilestoneNotified(userId, m.minutes);
  }
  return newlyReached[newlyReached.length - 1];
}

export function resetHealthNotifications(userId: number): void {
  db.prepare('DELETE FROM health_notifications WHERE user_id = ?').run(userId);
}
