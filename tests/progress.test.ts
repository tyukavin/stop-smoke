import { describe, it, expect } from 'vitest';
import { calcProgress, formatDuration, formatMinutes } from '../src/services/progress.js';
import type { DbUser } from '../src/types/index.js';

function makeUser(overrides: Partial<DbUser> = {}): DbUser {
  return {
    id: 1,
    telegram_id: 12345,
    username: 'test',
    first_name: 'Test',
    device_type: 'cigarettes',
    units_per_day: 20,
    price_per_pack: 250,
    units_in_pack: 20,
    nicotine_mg: 0,
    years_smoking: 5,
    timezone_offset: 3,
    motivation: 'Health',
    quit_date: new Date(Date.now() - 3 * 86400000).toISOString(),
    onboarding_done: 1,
    is_admin: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('calcProgress', () => {
  it('calculates smoke-free days correctly for 3 days', () => {
    const user = makeUser();
    const p = calcProgress(user);
    expect(p.smokeFreeDays).toBe(3);
  });

  it('calculates units avoided correctly', () => {
    const user = makeUser({ units_per_day: 20 });
    const p = calcProgress(user);
    expect(p.unitsAvoided).toBe(60);
  });

  it('calculates money saved correctly', () => {
    const user = makeUser({ units_per_day: 20, price_per_pack: 200, units_in_pack: 20 });
    const p = calcProgress(user);
    // 60 cigs * (200/20) = 60 * 10 = 600
    expect(p.moneySaved).toBe(600);
  });

  it('calculates life regained for cigarettes', () => {
    const user = makeUser({ units_per_day: 20 });
    const p = calcProgress(user);
    // 60 * 11 = 660
    expect(p.lifeRegainedMinutes).toBe(660);
  });

  it('handles IQOS device type', () => {
    const user = makeUser({ device_type: 'iqos', units_per_day: 20 });
    const p = calcProgress(user);
    expect(p.deviceLabel).toBe('стиков IQOS');
    // 60 * 7 = 420
    expect(p.lifeRegainedMinutes).toBe(420);
  });

  it('handles vape device type', () => {
    const user = makeUser({
      device_type: 'vape',
      units_per_day: 300,
      price_per_pack: 500,
      units_in_pack: 300,
    });
    const p = calcProgress(user);
    expect(p.deviceLabel).toBe('затяжек вейпа');
    expect(p.unitsAvoided).toBe(900);
    // 900 * (500/300) = 900 * 1.666 = 1500
    expect(p.moneySaved).toBe(1500);
  });

  it('handles mini_vape device type', () => {
    const user = makeUser({
      device_type: 'mini_vape',
      units_per_day: 600,
      price_per_pack: 800,
      units_in_pack: 600,
    });
    const p = calcProgress(user);
    expect(p.deviceLabel).toBe('затяжек мини-вейпа');
    expect(p.unitsAvoided).toBe(1800);
    expect(p.lifeRegainedMinutes).toBe(1800 * 2);
  });

  it('returns zero progress if no quit date', () => {
    const user = makeUser({ quit_date: null });
    const p = calcProgress(user);
    expect(p.smokeFreeDays).toBe(0);
    expect(p.unitsAvoided).toBe(0);
    expect(p.moneySaved).toBe(0);
  });

  it('handles zero units_in_pack without division by zero', () => {
    const user = makeUser({ units_in_pack: 0 });
    const p = calcProgress(user);
    expect(p.moneySaved).toBe(0);
  });

  it('calculates poison avoided for cigarettes', () => {
    const user = makeUser({ units_per_day: 20 });
    const p = calcProgress(user);
    // 60 * 0.012 = 0.72g
    expect(p.poisonAvoided).toBe('1 г');
  });
});

describe('formatDuration', () => {
  it('formats 0 days', () => expect(formatDuration(0)).toBe('меньше дня'));
  it('formats 1 day', () => expect(formatDuration(1)).toBe('1 дн.'));
  it('formats 35 days', () => expect(formatDuration(35)).toBe('1 мес. 5 дн.'));
  it('formats 400 days', () => expect(formatDuration(400)).toBe('1 г. 1 мес. 10 дн.'));
});

describe('formatMinutes', () => {
  it('formats minutes', () => expect(formatMinutes(45)).toBe('45 мин.'));
  it('formats hours', () => expect(formatMinutes(130)).toBe('2 ч. 10 мин.'));
  it('formats days', () => expect(formatMinutes(1500)).toBe('1 дн. 1 ч.'));
});
