import type { FastifyInstance } from 'fastify';
import {
  BOT_CONFIG_DEFAULTS,
  botConfigInvalidateCache,
  botConfigList,
  botConfigSet,
} from '../../services/botConfig.js';

export async function botConfigRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (app as any).authenticate);

  app.get('/', async (request, reply) => {
    const { admin } = request.user as any;
    if (!admin) return reply.status(403).send({ error: 'Admin only' });
    return { items: botConfigList(), keys: Object.keys(BOT_CONFIG_DEFAULTS) };
  });

  app.put<{ Params: { key: string }; Body: { value: string } }>('/:key', async (request, reply) => {
    const { admin } = request.user as any;
    if (!admin) return reply.status(403).send({ error: 'Admin only' });
    const key = request.params.key;
    if (!Object.prototype.hasOwnProperty.call(BOT_CONFIG_DEFAULTS, key)) {
      return reply.status(400).send({ error: 'Unknown key' });
    }
    const { value } = request.body || {};
    if (typeof value !== 'string') return reply.status(400).send({ error: 'value required' });
    botConfigSet(key, value);
    return { ok: true };
  });

  app.post('/reset', async (request, reply) => {
    const { admin } = request.user as any;
    if (!admin) return reply.status(403).send({ error: 'Admin only' });
    for (const [k, v] of Object.entries(BOT_CONFIG_DEFAULTS)) {
      botConfigSet(k, v);
    }
    botConfigInvalidateCache();
    return { ok: true };
  });
}

