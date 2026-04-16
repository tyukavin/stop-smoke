import type { FastifyInstance } from 'fastify';
import { getAllStickers, addSticker, updateSticker, deleteSticker, getStickerCount } from '../../services/stickers.js';

export async function stickersRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (app as any).authenticate);

  app.get('/', async (request, reply) => {
    const { admin } = request.user as any;
    if (!admin) return reply.status(403).send({ error: 'Admin only' });
    return { items: getAllStickers(), total: getStickerCount() };
  });

  app.post<{ Body: { file_id: string; context?: string } }>('/', async (request, reply) => {
    const { admin } = request.user as any;
    if (!admin) return reply.status(403).send({ error: 'Admin only' });
    const { file_id, context } = request.body;
    if (!file_id) return reply.status(400).send({ error: 'file_id required' });
    const id = addSticker(file_id, context || 'any');
    return { id };
  });

  app.put<{ Params: { id: string }; Body: { context?: string; active?: boolean } }>(
    '/:id', async (request, reply) => {
      const { admin } = request.user as any;
      if (!admin) return reply.status(403).send({ error: 'Admin only' });
      updateSticker(parseInt(request.params.id), request.body);
      return { ok: true };
    }
  );

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { admin } = request.user as any;
    if (!admin) return reply.status(403).send({ error: 'Admin only' });
    deleteSticker(parseInt(request.params.id));
    return { ok: true };
  });
}
