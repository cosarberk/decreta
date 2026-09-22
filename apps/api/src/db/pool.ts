import pg from 'pg';
import { config } from '../config/index.js';

/**
 * Uygulama genelinde tek bir PostgreSQL bağlantı havuzu. Servisler ve
 * repository'ler doğrudan bu havuzu ya da {@link query} yardımcısını kullanır.
 */
export const pool = new pg.Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: 10,
  idleTimeoutMillis: 30_000,
});

/**
 * Parametreli sorgu çalıştırır ve satırları döndürür.
 *
 * @typeParam T - Beklenen satır tipi.
 * @param text - `$1, $2 ...` yer tutuculu SQL metni.
 * @param params - Sıralı sorgu parametreleri.
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params as unknown[]);
  return result.rows;
}

/**
 * Verilen işlevi tek bir transaction içinde çalıştırır. İşlev hata fırlatırsa
 * ROLLBACK, aksi halde COMMIT uygulanır.
 */
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
