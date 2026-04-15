import type { FastifyInstance } from 'fastify';
import { getUserById, getAllActiveUsers, getUserCount, getActiveUserCount } from '../../services/user.js';

export async function usersRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (app as any).authenticate);

  app.get('/me', async (request) => {
    const { userId } = request.user as any;
    return getUserById(userId);
  });

  app.get('/stats', async (request) => {
    const { admin } = request.user as any;
    if (!admin) return { error: 'Admin only' };
    return { total: getUserCount(), active: getActiveUserCount() };
  });

  app.get('/', async (request) => {
    const { admin } = request.user as any;
    if (!admin) return { error: 'Admin only' };
    return getAllActiveUsers();
  });
}
