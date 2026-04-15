import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { config } from '../config.js';
import { authRoutes } from './routes/auth.js';
import { usersRoutes } from './routes/users.js';
import { progressRoutes } from './routes/progress.js';
import { contentRoutes } from './routes/content.js';
import { materialsRoutes } from './routes/materials.js';

export async function createApi() {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: config.jwtSecret });

  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  app.get('/api/health', () => ({ status: 'ok', version: '2.0.0' }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(progressRoutes, { prefix: '/api/progress' });
  await app.register(contentRoutes, { prefix: '/api/content' });
  await app.register(materialsRoutes, { prefix: '/api/materials' });

  return app;
}
