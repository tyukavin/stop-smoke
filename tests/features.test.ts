import { describe, it, expect } from 'vitest';
import { formatExactDuration, calcGoalProgress } from '../src/services/progress.js';
import { HEALTH_MILESTONES, getNextHealthMilestone, formatRemainingTime } from '../src/services/health.js';
import { DAILY_MISSIONS, getMissionForDay } from '../src/services/missions.js';
import { parseLocalQuitDate } from '../src/bot/handlers/settings.js';
import { escapeHtml, progressBar } from '../src/utils/html.js';
import type { DbUser } from '../src/types/index.js';

function makeUser(overrides: Partial<DbUser> = {}): DbUser {
  return {
    id: 1,
    telegram_id: 999,
    username: 'tester',
    first_name: 'Tester',
    device_type: 'cigarettes',
    units_per_day: 20,
    price_per_pack: 250,
    units_in_pack: 20,
    nicotine_mg: 0,
    years_smoking: 5,
    timezone_offset: 3,
    motivation: 'Health <3',
    quit_date: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    onboarding_done: 1,
    is_admin: 0,
    goal_title: 'AirPods',
    goal_amount: 10000,
    notifications_enabled: 1,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('formatExactDuration', () => {
  it('formats minutes under an hour', () => {
    expect(formatExactDuration(42)).toBe('42 мин.');
  });

  it('formats hours and minutes under a day', () => {
    expect(formatExactDuration(145)).toBe('2 ч. 25 мин.');
    expect(formatExactDuration(120)).toBe('2 ч.');
  });

  it('formats days and hours under a week', () => {
    expect(formatExactDuration(3 * 1440 + 5 * 60)).toBe('3 дн. 5 ч.');
  });

  it('switches to days/months formatting at 7+ days', () => {
    expect(formatExactDuration(10 * 1440)).toBe('10 дн.');
    expect(formatExactDuration(35 * 1440)).toBe('1 мес. 5 дн.');
  });
});

describe('calcGoalProgress', () => {
  it('returns null when goal is not set', () => {
    expect(calcGoalProgress(makeUser({ goal_title: '', goal_amount: 0 }), 500)).toBeNull();
  });

  it('calculates progress, remaining amount, and ETA', () => {
    const g = calcGoalProgress(makeUser({ goal_title: 'AirPods', goal_amount: 10000 }), 2500);
    expect(g).not.toBeNull();
    expect(g!.percent).toBe(25);
    expect(g!.remainingAmount).toBe(7500);
    expect(g!.reached).toBe(false);
    // 250 RUB/day -> 7500 / 250 = 30 days
    expect(g!.daysLeft).toBe(30);
    expect(g!.targetDateStr).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });

  it('marks goal as reached when moneySaved >= targetAmount', () => {
    const g = calcGoalProgress(makeUser({ goal_title: 'Coffee', goal_amount: 500 }), 750);
    expect(g!.reached).toBe(true);
    expect(g!.percent).toBe(100);
    expect(g!.remainingAmount).toBe(0);
  });
});

describe('Health milestones', () => {
  it('are sorted strictly ascending by minutes', () => {
    for (let i = 1; i < HEALTH_MILESTONES.length; i++) {
      expect(HEALTH_MILESTONES[i].minutes).toBeGreaterThan(HEALTH_MILESTONES[i - 1].minutes);
    }
  });

  it('computes next milestone and progress fraction', () => {
    const next = getNextHealthMilestone(10);
    expect(next).not.toBeNull();
    expect(next!.milestone.minutes).toBe(20);
    expect(next!.progressFraction).toBeCloseTo(0.5, 2);
    expect(formatRemainingTime(next!.remainingMinutes)).toBe('10 мин.');
  });

  it('returns null after all milestones are completed', () => {
    expect(getNextHealthMilestone(10_000_000)).toBeNull();
  });
});

describe('Daily missions', () => {
  it('defines 14 sequential daily missions', () => {
    expect(DAILY_MISSIONS.length).toBe(14);
    DAILY_MISSIONS.forEach((m, idx) => {
      expect(m.day).toBe(idx + 1);
      expect(m.title.length).toBeGreaterThan(3);
      expect(m.task.length).toBeGreaterThan(10);
    });
  });

  it('clamps out-of-range days safely', () => {
    expect(getMissionForDay(0).day).toBe(1);
    expect(getMissionForDay(99).day).toBe(14);
  });
});

describe('parseLocalQuitDate', () => {
  it('parses valid DD.MM.YYYY and DD.MM.YYYY HH:MM dates in the past', () => {
    const iso1 = parseLocalQuitDate('01.01.2025', 3);
    expect(iso1).toBe('2024-12-31T21:00:00.000Z');

    const iso2 = parseLocalQuitDate('15.06.2025 18:30', 3);
    expect(iso2).toBe('2025-06-15T15:30:00.000Z');
  });

  it('rejects invalid calendar dates and future dates', () => {
    expect(parseLocalQuitDate('31.02.2025', 3)).toBeNull();
    expect(parseLocalQuitDate('01.01.2099', 3)).toBeNull();
    expect(parseLocalQuitDate('not-a-date', 3)).toBeNull();
  });
});

describe('html utils', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d');
  });

  it('renders bounded progress bars', () => {
    expect(progressBar(0, 10)).toBe('░░░░░░░░░░');
    expect(progressBar(0.5, 10)).toBe('█████░░░░░');
    expect(progressBar(1.5, 10)).toBe('██████████');
  });
});
