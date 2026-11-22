import type { FastifyInstance } from 'fastify';
import { getMaterials, getAllMaterials, addMaterial, updateMaterial, deleteMaterial } from '../../services/materials.js';

export async function materialsRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const cat = (request.query as any).category;
    return getMaterials(cat || undefined);
  });

  app.get('/all', async (request, reply) => {
    try { await request.jwtVerify(); } catch { return reply.status(401).send({ error: 'Auth required' }); }
    const { admin } = request.user as any;
    if (!admin) return reply.status(403).send({ error: 'Admin only' });
    return getAllMaterials();
  });

  app.post<{ Body: { title: string; url: string; description?: string; category?: string } }>(
    '/', async (request, reply) => {
      try { await request.jwtVerify(); } catch { return reply.status(401).send({ error: 'Auth required' }); }
      const { admin } = request.user as any;
      if (!admin) return reply.status(403).send({ error: 'Admin only' });
      const { title, url, description, category } = request.body;
      const id = addMaterial(title, url, description || '', category || 'general');
      return { id };
    }
  );

  app.put<{
    Params: { id: string };
    Body: Partial<{ title: string; url: string; description: string; category: string; active: boolean; sort_order: number }>;
  }>('/:id', async (request, reply) => {
    try { await request.jwtVerify(); } catch { return reply.status(401).send({ error: 'Auth required' }); }
    const { admin } = request.user as any;
    if (!admin) return reply.status(403).send({ error: 'Admin only' });
    updateMaterial(parseInt(request.params.id, 10), request.body || {});
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try { await request.jwtVerify(); } catch { return reply.status(401).send({ error: 'Auth required' }); }
    const { admin } = request.user as any;
    if (!admin) return reply.status(403).send({ error: 'Admin only' });
    deleteMaterial(parseInt(request.params.id));
    return { ok: true };
  });
}
