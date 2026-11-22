import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import { resolve } from 'path';
import { config } from '../config.js';
import { authRoutes } from './routes/auth.js';
import { usersRoutes } from './routes/users.js';
import { progressRoutes } from './routes/progress.js';
import { contentRoutes } from './routes/content.js';
import { materialsRoutes } from './routes/materials.js';
import { stickersRoutes } from './routes/stickers.js';
import { botConfigRoutes } from './routes/botConfig.js';
import { webappRoutes } from './routes/webapp.js';

export async function createApi() {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: config.jwtSecret });

  await app.register(fastifyStatic, {
    root: resolve(process.cwd(), 'public'),
    prefix: '/',
  });

  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  app.get('/admin', async (_req, reply) => {
    return reply.sendFile('admin.html');
  });

  app.get('/app', async (_req, reply) => {
    return reply.sendFile('app.html');
  });

  app.get('/api/health', () => ({ status: 'ok', version: '2.0.0' }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(progressRoutes, { prefix: '/api/progress' });
  await app.register(contentRoutes, { prefix: '/api/content' });
  await app.register(materialsRoutes, { prefix: '/api/materials' });
  await app.register(stickersRoutes, { prefix: '/api/stickers' });
  await app.register(botConfigRoutes, { prefix: '/api/bot-config' });
  await app.register(webappRoutes, { prefix: '/api/webapp' });

  return app;
}
