import type { FastifyInstance } from 'fastify';
import { db } from '../../db/index.js';
import { config } from '../../config.js';

export async function authRoutes(app: FastifyInstance) {
  // Admin login by telegram_id (must be in ADMIN_IDS or is_admin=1)
  app.post<{ Body: { telegram_id: number } }>('/login', async (request, reply) => {
    const { telegram_id } = request.body || {};
    if (!telegram_id) return reply.status(400).send({ error: 'telegram_id required' });

    const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id) as any;
    const isAdminById = config.adminIds.includes(telegram_id);

    if (!user && !isAdminById) {
      return reply.status(401).send({ error: 'User not found' });
    }

    if (!isAdminById && !user?.is_admin) {
      return reply.status(403).send({ error: 'Not admin. Add your Telegram ID to ADMIN_IDS env var.' });
    }

    const userId = user?.id || 0;
    const token = app.jwt.sign(
      { userId, telegramId: telegram_id, admin: true },
      { expiresIn: '7d' }
    );
    return { token, user: user || null };
  });

  // User token by telegram_id
  app.post<{ Body: { telegram_id: number } }>('/token', async (request, reply) => {
    const { telegram_id } = request.body || {};
    if (!telegram_id) return reply.status(400).send({ error: 'telegram_id required' });

    const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id) as any;
    if (!user) return reply.status(404).send({ error: 'User not found' });

    const isAdmin = !!user.is_admin || config.adminIds.includes(telegram_id);
    const token = app.jwt.sign(
      { userId: user.id, telegramId: telegram_id, admin: isAdmin },
      { expiresIn: '30d' }
    );
    return { token };
  });
}
