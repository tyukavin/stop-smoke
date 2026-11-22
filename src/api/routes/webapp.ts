import type { FastifyInstance } from 'fastify';
import { config } from '../../config.js';
import { verifyTelegramInitData } from '../../utils/telegramAuth.js';
import { createUser, getUser, getUserById, updateUser, resetQuitDate } from '../../services/user.js';
import { calcProgress, calcGoalProgress } from '../../services/progress.js';
import { HEALTH_MILESTONES, getNextHealthMilestone } from '../../services/health.js';
import { DAILY_MISSIONS, completeMission, getCompletedMissionDays } from '../../services/missions.js';
import { ACHIEVEMENTS, checkAndUnlock, getUserAchievements } from '../../services/achievements.js';
import { getCravingAnalytics } from '../../services/analytics.js';
import { logCraving, logMood } from '../../services/craving.js';
import { getContentForUser, getRandomContent } from '../../services/content.js';
import type { DbUser } from '../../types/index.js';

function buildFullState(user: DbUser) {
  const progress = calcProgress(user);
  const newlyUnlocked = checkAndUnlock(user);
  const unlockedSet = new Set(getUserAchievements(user.id));
  const completedMissions = new Set(getCompletedMissionDays(user.id));
  const goal = calcGoalProgress(user, progress.moneySaved);
  const nextHealth = getNextHealthMilestone(progress.smokeFreeMinutes);
  const analytics = getCravingAnalytics(user.id, user.timezone_offset);

  return {
    user: {
      id: user.id,
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      username: user.username,
      device_type: user.device_type,
      units_per_day: user.units_per_day,
      price_per_pack: user.price_per_pack,
      units_in_pack: user.units_in_pack,
      motivation: user.motivation,
      quit_date: user.quit_date,
      onboarding_done: user.onboarding_done,
      goal_title: user.goal_title || '',
      goal_amount: user.goal_amount || 0,
    },
    progress,
    goal,
    nextHealth,
    healthMilestones: HEALTH_MILESTONES.map((m) => ({
      ...m,
      reached: progress.smokeFreeMinutes >= m.minutes,
    })),
    missions: DAILY_MISSIONS.map((m) => ({
      ...m,
      completed: completedMissions.has(m.day),
    })),
    achievements: ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: unlockedSet.has(a.code),
    })),
    newlyUnlocked,
    analytics,
    botHandle: config.botHandle,
  };
}

export async function webappRoutes(app: FastifyInstance) {
  // Exchange verified Telegram WebApp initData for JWT + bootstrap state
  app.post<{ Body: { initData?: string } }>('/auth', async (request, reply) => {
    const initData = request.body?.initData || '';
    const verified = verifyTelegramInitData(initData, config.botToken);
    if (!verified) {
      return reply.status(401).send({ error: 'Invalid Telegram initData' });
    }

    const tg = verified.user;
    let user = getUser(tg.id);
    if (!user) {
      user = createUser(tg.id, tg.username, tg.first_name);
    }
    // If user opened Mini App before /start, initialize a default quit_date so timer works
    if (!user.quit_date) {
      updateUser(tg.id, { quit_date: new Date().toISOString(), onboarding_done: 1 });
      user = getUser(tg.id)!;
    }

    const token = app.jwt.sign(
      { userId: user.id, telegramId: tg.id, admin: false },
      { expiresIn: '7d' }
    );

    return { token, state: buildFullState(user) };
  });

  // Protected Mini App routes
  app.register(async (authed) => {
    authed.addHook('onRequest', (app as any).authenticate);

    authed.get('/state', async (request, reply) => {
      const { userId } = request.user as any;
      const user = getUserById(userId);
      if (!user) return reply.status(404).send({ error: 'User not found' });
      return buildFullState(user);
    });

    authed.post<{
      Body: { intensity?: number; trigger?: string; resisted?: boolean; resetTimer?: boolean };
    }>('/craving', async (request, reply) => {
      const { userId } = request.user as any;
      const user = getUserById(userId);
      if (!user) return reply.status(404).send({ error: 'User not found' });

      const intensity = Math.max(1, Math.min(10, Math.round(Number(request.body?.intensity) || 5)));
      const trigger = String(request.body?.trigger || 'other').slice(0, 32);
      const resisted = request.body?.resisted !== false;
      const resetTimer = request.body?.resetTimer === true;

      logCraving(user.id, intensity, trigger, resisted);
      if (!resisted && resetTimer) {
        resetQuitDate(user.telegram_id);
      }

      const fresh = getUserById(userId)!;
      const tip = getContentForUser(user.id, 'trigger_tip', trigger) ?? getRandomContent('trigger_tip');
      return { state: buildFullState(fresh), tip: tip?.text || '' };
    });

    authed.post<{ Params: { day: string } }>('/mission/:day', async (request, reply) => {
      const { userId } = request.user as any;
      const user = getUserById(userId);
      if (!user) return reply.status(404).send({ error: 'User not found' });

      const day = parseInt(request.params.day, 10);
      if (isNaN(day) || day < 1 || day > DAILY_MISSIONS.length) {
        return reply.status(400).send({ error: 'Invalid mission day' });
      }
      const newlyDone = completeMission(user.id, day);
      return { newlyDone, state: buildFullState(user) };
    });

    authed.post<{ Body: { mood?: number; note?: string } }>('/mood', async (request, reply) => {
      const { userId } = request.user as any;
      const user = getUserById(userId);
      if (!user) return reply.status(404).send({ error: 'User not found' });

      const mood = Math.max(1, Math.min(5, Math.round(Number(request.body?.mood) || 3)));
      const note = String(request.body?.note || '').slice(0, 300);
      logMood(user.id, mood, note);
      return { ok: true, state: buildFullState(user) };
    });

    authed.post<{ Body: { title?: string; amount?: number } }>('/goal', async (request, reply) => {
      const { userId } = request.user as any;
      const user = getUserById(userId);
      if (!user) return reply.status(404).send({ error: 'User not found' });

      const title = String(request.body?.title || '').trim().slice(0, 80);
      const amount = Math.max(0, Math.min(100_000_000, Math.round(Number(request.body?.amount) || 0)));
      updateUser(user.telegram_id, {
        goal_title: amount > 0 ? title : '',
        goal_amount: title ? amount : 0,
      });
      const fresh = getUserById(userId)!;
      return { state: buildFullState(fresh) };
    });

    authed.get<{ Querystring: { type?: string } }>('/sos-tip', async (request, reply) => {
      const { userId } = request.user as any;
      const user = getUserById(userId);
      if (!user) return reply.status(404).send({ error: 'User not found' });

      const allowed = ['sos_rational', 'sos_switching', 'sos_celebrating', 'mindfulness', 'cbt_technique', 'myth', 'motivation'];
      const reqType = request.query?.type || '';
      const type = allowed.includes(reqType)
        ? reqType
        : allowed[Math.floor(Math.random() * 5)];
      const c = getContentForUser(user.id, type) ?? getRandomContent(type);
      return { type, text: c?.text || 'Тяга длится всего 3 минуты. Сделай глубокий вдох — ты уже свободен.' };
    });
  });
}
