import type { FastifyInstance } from 'fastify';
import { reportsService } from './reports.service.js';

/** Raporlama rotaları — tüm oturum açmış kullanıcılar erişebilir. */
export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/reports/summary', { preHandler: app.authenticate }, async () => {
    return reportsService.summary();
  });
}
