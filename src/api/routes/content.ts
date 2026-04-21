import type { FastifyInstance } from 'fastify';
import { getAllContent, addContent, updateContent, deleteContent, getContentCount } from '../../services/content.js';

export async function contentRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (app as any).authenticate);

  app.get('/', async (request) => {
    const { admin } = request.user as any;
    if (!admin) return { error: 'Admin only' };
    const type = (request.query as any).type;
    return { items: getAllContent(type), total: getContentCount(type) };
  });

  app.post<{ Body: { type: string; text: string; category?: string } }>('/', async (request, reply) => {
    const { admin } = request.user as any;
    if (!admin) return reply.status(403).send({ error: 'Admin only' });
    const { type, text, category } = request.body;
    const id = addContent(type, text, category || '');
    return { id };
  });

  app.put<{ Params: { id: string }; Body: { text?: string; active?: boolean; category?: string; type?: string } }>(
    '/:id', async (request, reply) => {
      const { admin } = request.user as any;
      if (!admin) return reply.status(403).send({ error: 'Admin only' });
      updateContent(parseInt(request.params.id), request.body);
      return { ok: true };
    }
  );

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { admin } = request.user as any;
    if (!admin) return reply.status(403).send({ error: 'Admin only' });
    deleteContent(parseInt(request.params.id));
    return { ok: true };
  });
}
