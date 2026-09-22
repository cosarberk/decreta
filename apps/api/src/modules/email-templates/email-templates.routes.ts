import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { emailTemplatesService } from './email-templates.service.js';

const keyParams = z.object({ key: z.string().min(1) });
const updateSchema = z.object({
  subject: z.string().trim().min(1, 'Konu zorunlu'),
  bodyHtml: z.string().trim().min(1, 'Gövde zorunlu'),
});

/** E-posta şablonu rotaları — tümü admin yetkisi ister. */
export async function emailTemplatesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/email-templates', { preHandler: app.requireAdmin }, async () => {
    return emailTemplatesService.list();
  });

  app.patch('/email-templates/:key', { preHandler: app.requireAdmin }, async (request) => {
    const { key } = keyParams.parse(request.params);
    const { subject, bodyHtml } = updateSchema.parse(request.body);
    return emailTemplatesService.update(key, subject, bodyHtml);
  });
}
