import pg from 'pg';
import { query, withTransaction } from '../../db/index.js';

/** `labels` tablosunun satır gösterimi. */
export interface LabelRow {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
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

  async create(name: string, color: string | null, description: string | null): Promise<LabelRow> {
    const rows = await query<LabelRow>(
      'INSERT INTO labels (name, color, description) VALUES ($1, $2, $3) RETURNING *',
      [name, color, description],
    );
    return rows[0]!;
  },

  async findById(id: string): Promise<LabelRow | null> {
    const rows = await query<LabelRow>('SELECT * FROM labels WHERE id = $1 LIMIT 1', [id]);
    return rows[0] ?? null;
  },

  async update(
    id: string,
    name: string,
    color: string | null,
    description: string | null,
  ): Promise<LabelRow | null> {
    const rows = await query<LabelRow>(
      'UPDATE labels SET name = $2, color = $3, description = $4 WHERE id = $1 RETURNING *',
      [id, name, color, description],
    );
    return rows[0] ?? null;
  },

  async mergeInto(fromId: string, toId: string): Promise<void> {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO record_labels (record_id, label_id)
         SELECT record_id, $2 FROM record_labels WHERE label_id = $1
         ON CONFLICT DO NOTHING`,
        [fromId, toId],
      );
      await client.query('DELETE FROM record_labels WHERE label_id = $1', [fromId]);
      await client.query('DELETE FROM labels WHERE id = $1', [fromId]);
    });
  },

  async countUsage(id: string): Promise<number> {
    const rows = await query<{ count: string }>(
      'SELECT count(*)::text AS count FROM record_labels WHERE label_id = $1',
      [id],
    );
    return Number(rows[0]?.count ?? 0);
  },

  async remove(id: string): Promise<void> {
    await query('DELETE FROM labels WHERE id = $1', [id]);
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
