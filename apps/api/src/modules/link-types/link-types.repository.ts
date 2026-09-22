import { query } from '../../db/index.js';

/** `link_types` tablosunun satır gösterimi. */
export interface LinkTypeRow {
  id: string;
  forward_name: string;
  inverse_name: string;
  color: string | null;
  is_supersede: boolean;
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
  }): Promise<LinkTypeRow> {
    const rows = await query<LinkTypeRow>(
      `INSERT INTO link_types (forward_name, inverse_name, color, is_supersede)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.forwardName, input.inverseName, input.color, input.isSupersede],
    );
    return rows[0]!;
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
