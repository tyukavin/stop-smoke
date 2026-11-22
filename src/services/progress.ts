import type { DbUser, DeviceType, ProgressData } from '../types/index.js';
import { DEVICE_LABELS, DEVICE_LIFE_MINUTES, DEVICE_POISON_FACTOR } from '../types/index.js';

export function calcProgress(user: DbUser): ProgressData {
  const deviceType = user.device_type as DeviceType;
  const now = Date.now();
  const quitMs = user.quit_date ? new Date(user.quit_date).getTime() : now;
  const diffMs = Math.max(0, now - quitMs);

  const totalMinutes = diffMs / 60_000;
  const totalHours = diffMs / 3_600_000;
  const totalDays = diffMs / 86_400_000;

  const unitsAvoided = Math.floor(totalDays * user.units_per_day);

  const pricePerUnit = user.units_in_pack > 0
    ? user.price_per_pack / user.units_in_pack
    : 0;
  const moneySaved = Math.round(unitsAvoided * pricePerUnit * 100) / 100;

  const lifeFactor = DEVICE_LIFE_MINUTES[deviceType] ?? 11;
  const lifeRegainedMinutes = unitsAvoided * lifeFactor;

  const poisonFactor = DEVICE_POISON_FACTOR[deviceType] ?? 0.012;
  const poisonGrams = unitsAvoided * poisonFactor;
  const poisonAvoided = poisonGrams >= 1000
    ? `${(poisonGrams / 1000).toFixed(1)} кг`
    : `${Math.round(poisonGrams)} г`;

  return {
    smokeFreeDays: Math.floor(totalDays),
    smokeFreeHours: Math.floor(totalHours),
    smokeFreeMinutes: Math.floor(totalMinutes),
    unitsAvoided,
    moneySaved,
    lifeRegainedMinutes,
    poisonAvoided,
    deviceLabel: DEVICE_LABELS[deviceType] ?? 'сигарет',
  };
}

export function formatDuration(days: number): string {
  if (days === 0) return 'меньше дня';
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const d = days % 30;
  const parts: string[] = [];
  if (years) parts.push(`${years} г.`);
  if (months) parts.push(`${months} мес.`);
  if (d || !parts.length) parts.push(`${d} дн.`);
  return parts.join(' ');
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} мин.`;
  const hours = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (hours < 24) return `${hours} ч. ${m} мин.`;
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  return `${days} дн. ${h} ч.`;
}

/**
 * Human-friendly exact duration: shows hours/minutes during the critical first 7 days,
 * then switches to days/months/years.
 */
export function formatExactDuration(totalMinutes: number): string {
  const mins = Math.max(0, Math.floor(totalMinutes));
  if (mins < 60) return `${mins} мин.`;
  const totalHours = Math.floor(mins / 60);
  if (totalHours < 24) {
    const m = mins % 60;
    return m > 0 ? `${totalHours} ч. ${m} мин.` : `${totalHours} ч.`;
  }
  const days = Math.floor(totalHours / 24);
  if (days < 7) {
    const h = totalHours % 24;
    return h > 0 ? `${days} дн. ${h} ч.` : `${days} дн.`;
  }
  return formatDuration(days);
}

export interface GoalProgress {
  title: string;
  targetAmount: number;
  savedAmount: number;
  remainingAmount: number;
  fraction: number;
  percent: number;
  reached: boolean;
  daysLeft: number | null;
  targetDateStr: string | null;
}

export function calcGoalProgress(user: DbUser, moneySaved: number): GoalProgress | null {
  const title = (user.goal_title || '').trim();
  const targetAmount = Number(user.goal_amount || 0);
  if (!title || targetAmount <= 0) return null;

  const fraction = Math.min(1, Math.max(0, moneySaved / targetAmount));
  const percent = Math.min(100, Math.round(fraction * 100));
  const remainingAmount = Math.max(0, Math.ceil(targetAmount - moneySaved));
  const reached = moneySaved >= targetAmount;

  const pricePerUnit = user.units_in_pack > 0 ? user.price_per_pack / user.units_in_pack : 0;
  const dailySpend = pricePerUnit * user.units_per_day;

  let daysLeft: number | null = null;
  let targetDateStr: string | null = null;
  if (!reached && dailySpend > 0) {
    daysLeft = Math.ceil(remainingAmount / dailySpend);
    const dt = new Date(Date.now() + daysLeft * 86_400_000);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    targetDateStr = `${dd}.${mm}.${yyyy}`;
  }

  return {
    title,
    targetAmount,
    savedAmount: Math.round(moneySaved),
    remainingAmount,
    fraction,
    percent,
    reached,
    daysLeft,
    targetDateStr,
  };
}
