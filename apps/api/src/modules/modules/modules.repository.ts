import pg from 'pg';
import { query, withTransaction } from '../../db/index.js';

/** `modules` tablosunun satır gösterimi. */
export interface ModuleRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ModuleWithUsage extends ModuleRow {
  usage_count: number;
}

export const modulesRepository = {
  async listWithUsage(): Promise<ModuleWithUsage[]> {
    return query<ModuleWithUsage>(
      `SELECT m.*, count(rm.record_id)::int AS usage_count
       FROM modules m
       LEFT JOIN record_modules rm ON rm.module_id = m.id
       GROUP BY m.id
       ORDER BY usage_count DESC, lower(m.name) ASC`,
    );
  },

  async findByName(name: string): Promise<ModuleRow | null> {
    const rows = await query<ModuleRow>(
      'SELECT * FROM modules WHERE lower(name) = lower($1) LIMIT 1',
      [name],
    );
    return rows[0] ?? null;
  },

  async create(name: string, description: string | null): Promise<ModuleRow> {
    const rows = await query<ModuleRow>(
      'INSERT INTO modules (name, description) VALUES ($1, $2) RETURNING *',
      [name, description],
    );
    return rows[0]!;
  },

  async findById(id: string): Promise<ModuleRow | null> {
    const rows = await query<ModuleRow>('SELECT * FROM modules WHERE id = $1 LIMIT 1', [id]);
    return rows[0] ?? null;
  },

  async update(id: string, name: string, description: string | null): Promise<ModuleRow | null> {
    const rows = await query<ModuleRow>(
      'UPDATE modules SET name = $2, description = $3 WHERE id = $1 RETURNING *',
      [id, name, description],
    );
    return rows[0] ?? null;
  },

  /** `fromId` modülünün tüm kayıt kullanımlarını `toId`'ye taşır ve `fromId`'yi siler. */
  async mergeInto(fromId: string, toId: string): Promise<void> {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO record_modules (record_id, module_id)
         SELECT record_id, $2 FROM record_modules WHERE module_id = $1
         ON CONFLICT DO NOTHING`,
        [fromId, toId],
      );
      await client.query('DELETE FROM record_modules WHERE module_id = $1', [fromId]);
      await client.query('DELETE FROM modules WHERE id = $1', [fromId]);
    });
  },

  async countUsage(id: string): Promise<number> {
    const rows = await query<{ count: string }>(
      'SELECT count(*)::text AS count FROM record_modules WHERE module_id = $1',
      [id],
    );
    return Number(rows[0]?.count ?? 0);
  },

  async remove(id: string): Promise<void> {
    await query('DELETE FROM modules WHERE id = $1', [id]);
  },

  async findOrCreate(client: pg.PoolClient, name: string): Promise<string> {
    const trimmed = name.trim();
    const insert = await client.query<{ id: string }>(
      `INSERT INTO modules (name) VALUES ($1)
       ON CONFLICT (lower(name)) DO NOTHING RETURNING id`,
      [trimmed],
    );
    if (insert.rows[0]) return insert.rows[0].id;
    const existing = await client.query<{ id: string }>(
      'SELECT id FROM modules WHERE lower(name) = lower($1) LIMIT 1',
      [trimmed],
    );
    return existing.rows[0]!.id;
  },
};
