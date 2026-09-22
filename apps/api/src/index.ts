import { buildApp } from './app.js';
import { config } from './config/index.js';
import { pool, runMigrations } from './db/index.js';
import { authService } from './modules/auth/index.js';

/** Uygulamayı başlatır: şema migration'ları, ilk admin, HTTP sunucusu. */
async function main(): Promise<void> {
  await runMigrations();
  await authService.ensureBootstrapAdmin();

  const app = await buildApp();
  await app.listen({ host: '0.0.0.0', port: config.port });

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`${signal} alındı, kapatılıyor...`);
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('Başlatma hatası:', error);
  process.exit(1);
});
