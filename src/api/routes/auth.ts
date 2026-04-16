import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { db } from '../../db/index.js';

interface AdminRow {
  id: number;
  login: string;
  password_hash: string;
  name: string;
}

export async function authRoutes(app: FastifyInstance) {
  // Admin login by login + password
  app.post<{ Body: { login: string; password: string } }>('/login', async (request, reply) => {
    const { login, password } = request.body || {};
    if (!login || !password) return reply.status(400).send({ error: 'login and password required' });

    const admin = db.prepare('SELECT * FROM admins WHERE login = ?').get(login) as AdminRow | undefined;
    if (!admin) return reply.status(401).send({ error: 'Invalid credentials' });

    if (!bcrypt.compareSync(password, admin.password_hash)) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = app.jwt.sign(
      { adminId: admin.id, login: admin.login, admin: true },
      { expiresIn: '7d' }
    );
    return { token, name: admin.name };
  });

  // Change password
  app.post<{ Body: { old_password: string; new_password: string } }>('/password', async (request, reply) => {
    try { await request.jwtVerify(); } catch { return reply.status(401).send({ error: 'Unauthorized' }); }
    const { adminId } = request.user as any;
    const { old_password, new_password } = request.body || {};

    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId) as AdminRow | undefined;
    if (!admin) return reply.status(404).send({ error: 'Admin not found' });
    if (!bcrypt.compareSync(old_password, admin.password_hash)) {
      return reply.status(401).send({ error: 'Wrong old password' });
    }

    const hash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, adminId);
    return { ok: true };
  });

  // User API token (for mobile apps)
  app.post<{ Body: { telegram_id: number } }>('/token', async (request, reply) => {
    const { telegram_id } = request.body || {};
    if (!telegram_id) return reply.status(400).send({ error: 'telegram_id required' });

    const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id) as any;
    if (!user) return reply.status(404).send({ error: 'User not found' });

    const token = app.jwt.sign(
      { userId: user.id, telegramId: telegram_id, admin: false },
      { expiresIn: '30d' }
    );
    return { token };
  });
}
