import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const currentDir = dirname(fileURLToPath(import.meta.url));

/**
 * `migrations/` klasöründeki `.sql` dosyalarını isimlerine göre sıralı
 * uygular. Uygulanan her migration `schema_migrations` tablosuna işlenir;
 * böylece her açılışta yalnızca yeni dosyalar çalıştırılır (idempotent).
 *
 * Klasör, hem dev (kaynak: ../../migrations) hem de prod (dist yanında:
 * ../migrations) düzenlerinde aranır.
 */
export async function runMigrations(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const dir = await resolveMigrationsDir();
  const files = (await readdir(dir))
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const applied = new Set(
    (await pool.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map(
      (row) => row.name,
    ),
  );

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Migration başarısız: ${file}\n${(error as Error).message}`);
    } finally {
      client.release();
    }
  }
}

/** Migration klasörünü dev ve prod yerleşimleri arasından bulur. */
async function resolveMigrationsDir(): Promise<string> {
  const candidates = [
    join(currentDir, '../../migrations'), // dev: src/db -> apps/api/migrations
    join(currentDir, '../migrations'), // prod: dist/db -> apps/api/migrations
  ];
  for (const candidate of candidates) {
    try {
      await readdir(candidate);
      return candidate;
    } catch {
      // sıradaki adaya geç
    }
  }
  throw new Error('migrations klasörü bulunamadı');
}
