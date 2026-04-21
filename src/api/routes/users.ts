import type { FastifyInstance } from 'fastify';
import { db } from '../../db/index.js';
import { getUserById, getAllUsers, getUserCount, getActiveUserCount } from '../../services/user.js';

export async function usersRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (app as any).authenticate);

  app.get('/me', async (request) => {
    const { userId } = request.user as any;
    if (!userId) return { error: 'User token required' };
    return getUserById(userId);
  });

  app.get('/stats', async (request, reply) => {
    const { admin } = request.user as any;
    if (!admin) return reply.status(403).send({ error: 'Admin only' });
    return { total: getUserCount(), active: getActiveUserCount() };
  });

  app.get('/', async (request, reply) => {
    const { admin } = request.user as any;
    if (!admin) return reply.status(403).send({ error: 'Admin only' });
    // Все пользователи (включая не завершивших онбординг) — иначе таблица «пустая»
    return getAllUsers();
  });

  // Get single user by internal id
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { admin } = request.user as any;
    if (!admin) return reply.status(403).send({ error: 'Admin only' });
    const user = getUserById(parseInt(request.params.id));
    if (!user) return reply.status(404).send({ error: 'Not found' });
    return user;
  });

  // Edit user fields
  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>('/:id', async (request, reply) => {
    const { admin } = request.user as any;
    if (!admin) return reply.status(403).send({ error: 'Admin only' });
    const id = parseInt(request.params.id);
    const allowed = new Set([
      'device_type', 'units_per_day', 'price_per_pack', 'units_in_pack',
      'nicotine_mg', 'years_smoking', 'timezone_offset', 'motivation',
      'quit_date', 'onboarding_done', 'is_admin',
    ]);
    const entries = Object.entries(request.body).filter(([k]) => allowed.has(k));
    if (!entries.length) return { ok: true };
    const sets = entries.map(([k]) => `${k} = ?`).join(', ');
    const vals = entries.map(([, v]) => v);
    db.prepare(`UPDATE users SET ${sets} WHERE id = ?`).run(...vals, id);
    return { ok: true };
  });

  // Delete user
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { admin } = request.user as any;
    if (!admin) return reply.status(403).send({ error: 'Admin only' });
    const id = parseInt(request.params.id);
    db.prepare('DELETE FROM content_deliveries WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM daily_checkins WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM mood_logs WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM user_achievements WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM cravings WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return { ok: true };
  });
}
