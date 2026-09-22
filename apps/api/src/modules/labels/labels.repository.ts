import pg from 'pg';
import { query } from '../../db/index.js';

/** `labels` tablosunun satır gösterimi. */
export interface LabelRow {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

/** Etiket + kaç kayıtta kullanıldığı (filtre panelinde gösterilir). */
export interface LabelWithUsage extends LabelRow {
  usage_count: number;
}

export const labelsRepository = {
  /** Tüm etiketleri kullanım sayısıyla (azalan) döndürür. */
  async listWithUsage(): Promise<LabelWithUsage[]> {
    return query<LabelWithUsage>(
      `SELECT l.*, count(rl.record_id)::int AS usage_count
       FROM labels l
       LEFT JOIN record_labels rl ON rl.label_id = l.id
       GROUP BY l.id
       ORDER BY usage_count DESC, lower(l.name) ASC`,
    );
  },

  async findByName(name: string): Promise<LabelRow | null> {
    const rows = await query<LabelRow>(
      'SELECT * FROM labels WHERE lower(name) = lower($1) LIMIT 1',
      [name],
    );
    return rows[0] ?? null;
  },

  async create(name: string, color: string | null): Promise<LabelRow> {
    const rows = await query<LabelRow>(
      'INSERT INTO labels (name, color) VALUES ($1, $2) RETURNING *',
      [name, color],
    );
    return rows[0]!;
  },

  /** İsimden etiket bulur, yoksa oluşturur (kayıt transaction'ı içinde). */
  async findOrCreate(client: pg.PoolClient, name: string): Promise<string> {
    const trimmed = name.trim();
    const insert = await client.query<{ id: string }>(
      `INSERT INTO labels (name) VALUES ($1)
       ON CONFLICT (lower(name)) DO NOTHING
       RETURNING id`,
      [trimmed],
    );
    if (insert.rows[0]) return insert.rows[0].id;
    const existing = await client.query<{ id: string }>(
      'SELECT id FROM labels WHERE lower(name) = lower($1) LIMIT 1',
      [trimmed],
    );
    return existing.rows[0]!.id;
  },
};
