import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { db } from '../../db/index.js';

export async function authRoutes(app: FastifyInstance) {
  // Login with telegram_id + password (set via /setpassword bot command)
  app.post<{ Body: { telegram_id: number; password: string } }>('/login', async (request, reply) => {
    const { telegram_id, password } = request.body;
    const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id) as any;
    if (!user) return reply.status(401).send({ error: 'User not found' });

    // For admin API access, check is_admin
    if (!user.is_admin) return reply.status(403).send({ error: 'Not admin' });

    // Simple auth: admin users get JWT by telegram_id
    const token = app.jwt.sign({ userId: user.id, telegramId: user.telegram_id, admin: true }, { expiresIn: '7d' });
    return { token };
  });

  // Public: create API token for regular user (by telegram_id)
  app.post<{ Body: { telegram_id: number } }>('/token', async (request, reply) => {
    const { telegram_id } = request.body;
    const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id) as any;
    if (!user) return reply.status(404).send({ error: 'User not found' });

    const token = app.jwt.sign({ userId: user.id, telegramId: user.telegram_id, admin: !!user.is_admin }, { expiresIn: '30d' });
    return { token };
  });
}
