import pg from 'pg';
import { query } from '../../db/index.js';

/** `persons` tablosunun satır gösterimi. */
export interface PersonRow {
  id: string;
  full_name: string;
  created_at: string;
}

export const personsRepository = {
  /** İsimde (fuzzy) arama; boş sorgu son eklenenleri döndürür. */
  async search(term: string, limit: number): Promise<PersonRow[]> {
    if (term.trim().length === 0) {
      return query<PersonRow>(
        'SELECT * FROM persons ORDER BY created_at DESC LIMIT $1',
        [limit],
      );
    }
    return query<PersonRow>(
      `SELECT * FROM persons
       WHERE full_name ILIKE '%' || $1 || '%'
       ORDER BY similarity(full_name, $1) DESC, full_name ASC
       LIMIT $2`,
      [term.trim(), limit],
    );
  },

  async findByName(fullName: string): Promise<PersonRow | null> {
    const rows = await query<PersonRow>(
      'SELECT * FROM persons WHERE lower(full_name) = lower($1) LIMIT 1',
      [fullName],
    );
    return rows[0] ?? null;
  },

  async findByIds(ids: readonly string[]): Promise<PersonRow[]> {
    if (ids.length === 0) return [];
    return query<PersonRow>('SELECT * FROM persons WHERE id = ANY($1)', [ids]);
  },

  async create(fullName: string): Promise<PersonRow> {
    const rows = await query<PersonRow>(
      'INSERT INTO persons (full_name) VALUES ($1) RETURNING *',
      [fullName],
    );
    return rows[0]!;
  },

  /**
   * İsimden kişi bulur, yoksa oluşturur (aynı transaction içinde). Eşzamanlı
   * eklemeye karşı `ON CONFLICT` ile güvenlidir.
   */
  async findOrCreate(client: pg.PoolClient, fullName: string): Promise<string> {
    const trimmed = fullName.trim();
    const insert = await client.query<{ id: string }>(
      `INSERT INTO persons (full_name) VALUES ($1)
       ON CONFLICT (lower(full_name)) DO NOTHING
       RETURNING id`,
      [trimmed],
    );
    if (insert.rows[0]) return insert.rows[0].id;
    const existing = await client.query<{ id: string }>(
      'SELECT id FROM persons WHERE lower(full_name) = lower($1) LIMIT 1',
      [trimmed],
    );
    return existing.rows[0]!.id;
  },
};
