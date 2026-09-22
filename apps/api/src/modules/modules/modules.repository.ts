import pg from 'pg';
import { query } from '../../db/index.js';

/** `modules` tablosunun satır gösterimi. */
export interface ModuleRow {
  id: string;
  name: string;
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

  async create(name: string): Promise<ModuleRow> {
    const rows = await query<ModuleRow>('INSERT INTO modules (name) VALUES ($1) RETURNING *', [
      name,
    ]);
    return rows[0]!;
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
