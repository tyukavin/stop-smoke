import { db } from '../db/index.js';

export const TRIGGER_LABELS: Record<string, string> = {
  stress: '😤 Стресс',
  boredom: '🥱 Скука',
  social: '👥 Компания',
  coffee: '☕ Кофе / еда',
  alcohol: '🍺 Алкоголь',
  morning: '🌅 Утро',
  driving: '🚗 Вождение',
  anxiety: '😰 Тревога',
  other: '❓ Другое',
};

export const TIME_BUCKETS = {
  morning: '🌅 Утро (06–12)',
  day: '☀️ День (12–18)',
  evening: '🌆 Вечер (18–24)',
  night: '🌙 Ночь (00–06)',
} as const;

export type TimeBucketKey = keyof typeof TIME_BUCKETS;

export interface TriggerBreakdown {
  trigger: string;
  label: string;
  count: number;
  resisted: number;
  percent: number;
}

export interface CravingAnalytics {
  total: number;
  resisted: number;
  winRate: number;
  avgIntensity: number;
  recent7dCount: number;
  prev7dCount: number;
  recent7dAvgIntensity: number | null;
  prev7dAvgIntensity: number | null;
  topTriggers: TriggerBreakdown[];
  peakTimeBucket: { key: TimeBucketKey; label: string; count: number } | null;
  moodAvg7d: number | null;
  moodCount7d: number;
}

interface CravingRow {
  intensity: number;
  trigger_type: string;
  resisted: number;
  created_at: string;
}

function parseSqliteUtc(ts: string): Date {
  // SQLite datetime('now') is 'YYYY-MM-DD HH:MM:SS' in UTC
  if (ts.includes('T')) return new Date(ts);
  return new Date(ts.replace(' ', 'T') + 'Z');
}

function bucketForHour(hour: number): TimeBucketKey {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'day';
  if (hour >= 18 && hour < 24) return 'evening';
  return 'night';
}

export function getCravingAnalytics(userId: number, timezoneOffset = 3): CravingAnalytics {
  const rows = db
    .prepare('SELECT intensity, trigger_type, resisted, created_at FROM cravings WHERE user_id = ?')
    .all(userId) as CravingRow[];

  const total = rows.length;
  const resisted = rows.filter((r) => r.resisted === 1).length;
  const winRate = total > 0 ? Math.round((resisted / total) * 100) : 100;
  const avgIntensity =
    total > 0 ? Math.round((rows.reduce((s, r) => s + r.intensity, 0) / total) * 10) / 10 : 0;

  const now = Date.now();
  const ms7d = 7 * 86_400_000;
  const recentRows: CravingRow[] = [];
  const prevRows: CravingRow[] = [];

  const triggerMap = new Map<string, { count: number; resisted: number }>();
  const timeCounts: Record<TimeBucketKey, number> = {
    morning: 0,
    day: 0,
    evening: 0,
    night: 0,
  };

  for (const r of rows) {
    const dt = parseSqliteUtc(r.created_at);
    const age = now - dt.getTime();
    if (age <= ms7d) recentRows.push(r);
    else if (age <= ms7d * 2) prevRows.push(r);

    const trig = r.trigger_type || 'other';
    const entry = triggerMap.get(trig) ?? { count: 0, resisted: 0 };
    entry.count++;
    if (r.resisted === 1) entry.resisted++;
    triggerMap.set(trig, entry);

    const localHour = (dt.getUTCHours() + timezoneOffset + 24) % 24;
    timeCounts[bucketForHour(localHour)]++;
  }

  const topTriggers: TriggerBreakdown[] = [...triggerMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4)
    .map(([trigger, v]) => ({
      trigger,
      label: TRIGGER_LABELS[trigger] || trigger,
      count: v.count,
      resisted: v.resisted,
      percent: total > 0 ? Math.round((v.count / total) * 100) : 0,
    }));

  let peakTimeBucket: CravingAnalytics['peakTimeBucket'] = null;
  if (total > 0) {
    const sortedBuckets = (Object.entries(timeCounts) as [TimeBucketKey, number][]).sort(
      (a, b) => b[1] - a[1]
    );
    if (sortedBuckets[0][1] > 0) {
      const key = sortedBuckets[0][0];
      peakTimeBucket = { key, label: TIME_BUCKETS[key], count: sortedBuckets[0][1] };
    }
  }

  const recent7dAvgIntensity =
    recentRows.length > 0
      ? Math.round((recentRows.reduce((s, r) => s + r.intensity, 0) / recentRows.length) * 10) / 10
      : null;
  const prev7dAvgIntensity =
    prevRows.length > 0
      ? Math.round((prevRows.reduce((s, r) => s + r.intensity, 0) / prevRows.length) * 10) / 10
      : null;

  const moodRow = db
    .prepare(
      `SELECT COUNT(*) as cnt, AVG(mood) as avg_m
       FROM mood_logs
       WHERE user_id = ? AND created_at >= datetime('now', '-7 days')`
    )
    .get(userId) as { cnt: number; avg_m: number | null };

  return {
    total,
    resisted,
    winRate,
    avgIntensity,
    recent7dCount: recentRows.length,
    prev7dCount: prevRows.length,
    recent7dAvgIntensity,
    prev7dAvgIntensity,
    topTriggers,
    peakTimeBucket,
    moodAvg7d: moodRow.cnt > 0 && moodRow.avg_m !== null ? Math.round(moodRow.avg_m * 10) / 10 : null,
    moodCount7d: moodRow.cnt,
  };
}
