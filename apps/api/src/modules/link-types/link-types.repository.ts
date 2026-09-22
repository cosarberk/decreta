import { query, withTransaction } from '../../db/index.js';

/** `link_types` tablosunun satır gösterimi. */
export interface LinkTypeRow {
  id: string;
  forward_name: string;
  inverse_name: string;
  color: string | null;
  is_supersede: boolean;
  description: string | null;
  created_at: string;
}

export const linkTypesRepository = {
  async list(): Promise<LinkTypeRow[]> {
    return query<LinkTypeRow>('SELECT * FROM link_types ORDER BY lower(forward_name) ASC');
  },

  async findById(id: string): Promise<LinkTypeRow | null> {
    const rows = await query<LinkTypeRow>('SELECT * FROM link_types WHERE id = $1 LIMIT 1', [id]);
    return rows[0] ?? null;
  },

  async findByForwardName(name: string): Promise<LinkTypeRow | null> {
    const rows = await query<LinkTypeRow>(
      'SELECT * FROM link_types WHERE lower(forward_name) = lower($1) LIMIT 1',
      [name],
    );
    return rows[0] ?? null;
  },

  async create(input: {
    forwardName: string;
    inverseName: string;
    color: string | null;
    isSupersede: boolean;
    description: string | null;
  }): Promise<LinkTypeRow> {
    const rows = await query<LinkTypeRow>(
      `INSERT INTO link_types (forward_name, inverse_name, color, is_supersede, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [input.forwardName, input.inverseName, input.color, input.isSupersede, input.description],
    );
    return rows[0]!;
  },

  async update(
    id: string,
    input: {
      forwardName: string;
      inverseName: string;
      color: string | null;
      isSupersede: boolean;
      description: string | null;
    },
  ): Promise<LinkTypeRow | null> {
    const rows = await query<LinkTypeRow>(
      `UPDATE link_types SET forward_name = $2, inverse_name = $3, color = $4, is_supersede = $5,
         description = $6
       WHERE id = $1 RETURNING *`,
      [id, input.forwardName, input.inverseName, input.color, input.isSupersede, input.description],
    );
    return rows[0] ?? null;
  },

  /** `fromId` tipindeki bağlantıları `toId`'ye taşır (çakışanları atar) ve tipi siler. */
  async mergeInto(fromId: string, toId: string): Promise<void> {
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE record_links rl SET link_type_id = $2
         WHERE rl.link_type_id = $1
           AND NOT EXISTS (
             SELECT 1 FROM record_links r2
             WHERE r2.from_record = rl.from_record AND r2.to_record = rl.to_record
               AND r2.link_type_id = $2)`,
        [fromId, toId],
      );
      await client.query('DELETE FROM record_links WHERE link_type_id = $1', [fromId]);
      await client.query('DELETE FROM link_types WHERE id = $1', [fromId]);
    });
  },

  async countUsage(id: string): Promise<number> {
    const rows = await query<{ count: string }>(
      'SELECT count(*)::text AS count FROM record_links WHERE link_type_id = $1',
      [id],
    );
    return Number(rows[0]?.count ?? 0);
  },

  async remove(id: string): Promise<void> {
    await query('DELETE FROM link_types WHERE id = $1', [id]);
  },
};
