import type { FastifyInstance } from 'fastify';
import { getUserById } from '../../services/user.js';
import { calcProgress } from '../../services/progress.js';
import { getCravingStats } from '../../services/craving.js';
import { getUserAchievements } from '../../services/achievements.js';
import { getCravingAnalytics } from '../../services/analytics.js';
import { DAILY_MISSIONS, getCompletedMissionDays } from '../../services/missions.js';

export async function progressRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (app as any).authenticate);

  app.get('/', async (request) => {
    const { userId } = request.user as any;
    const user = getUserById(userId);
    if (!user) return { error: 'Not found' };
    return calcProgress(user);
  });

  app.get('/cravings', async (request) => {
    const { userId } = request.user as any;
    return getCravingStats(userId);
  });

  app.get('/analytics', async (request) => {
    const { userId } = request.user as any;
    const user = getUserById(userId);
    return getCravingAnalytics(userId, user?.timezone_offset ?? 3);
  });

  app.get('/missions', async (request) => {
    const { userId } = request.user as any;
    const completed = new Set(getCompletedMissionDays(userId));
    return DAILY_MISSIONS.map((m) => ({
      ...m,
      completed: completed.has(m.day),
    }));
  });

  app.get('/achievements', async (request) => {
    const { userId } = request.user as any;
    return getUserAchievements(userId);
  });
}
