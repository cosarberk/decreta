import { query } from '../../db/index.js';

/** `users` tablosunun ham satır gösterimi. */
export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'admin' | 'user';
  is_active: boolean;
  available_as_person: boolean;
  created_at: string;
  updated_at: string;
}

/** Parola özeti olmadan dışarıya açılabilir kullanıcı görünümü. */
export type PublicUser = Omit<UserRow, 'password_hash'>;

const PUBLIC_COLUMNS =
  'id, email, full_name, role, is_active, available_as_person, created_at, updated_at';

export const usersRepository = {
  async findByEmail(email: string): Promise<UserRow | null> {
    const rows = await query<UserRow>(
      'SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1',
      [email],
    );
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<PublicUser | null> {
    const rows = await query<PublicUser>(
      `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  },

  /** Parola özeti dahil ham satır (kimlik/parola doğrulaması için). */
  async findRowById(id: string): Promise<UserRow | null> {
    const rows = await query<UserRow>('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    return rows[0] ?? null;
  },

  async updateFullName(id: string, fullName: string): Promise<PublicUser | null> {
    const rows = await query<PublicUser>(
      `UPDATE users SET full_name = $2, updated_at = now()
       WHERE id = $1 RETURNING ${PUBLIC_COLUMNS}`,
      [id, fullName],
    );
    return rows[0] ?? null;
  },

  /** Admin: isim + e-postayı birlikte günceller. */
  async updateProfile(id: string, fullName: string, email: string): Promise<PublicUser | null> {
    const rows = await query<PublicUser>(
      `UPDATE users SET full_name = $2, email = $3, updated_at = now()
       WHERE id = $1 RETURNING ${PUBLIC_COLUMNS}`,
      [id, fullName, email],
    );
    return rows[0] ?? null;
  },

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [
      id,
      passwordHash,
    ]);
  },

  async list(): Promise<PublicUser[]> {
    return query<PublicUser>(
      `SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY created_at ASC`,
    );
  },

  /** Bildirim için aktif kullanıcıların e-postaları (isteğe bağlı biri hariç). */
  async listActiveRecipients(excludeId?: string): Promise<{ id: string; email: string; full_name: string }[]> {
    return query<{ id: string; email: string; full_name: string }>(
      `SELECT id, email, full_name FROM users
       WHERE is_active = true AND ($1::uuid IS NULL OR id <> $1)`,
      [excludeId ?? null],
    );
  },

  /** Verilen id listesindeki kullanıcıları döndürür (toplu e-posta işlemleri için). */
  async listByIds(ids: readonly string[]): Promise<PublicUser[]> {
    if (ids.length === 0) return [];
    return query<PublicUser>(
      `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ANY($1) ORDER BY full_name`,
      [ids],
    );
  },

  async create(input: {
    email: string;
    passwordHash: string;
    fullName: string;
    role: 'admin' | 'user';
  }): Promise<PublicUser> {
    const rows = await query<PublicUser>(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING ${PUBLIC_COLUMNS}`,
      [input.email, input.passwordHash, input.fullName, input.role],
    );
    return rows[0]!;
  },

  async setActive(id: string, isActive: boolean): Promise<PublicUser | null> {
    const rows = await query<PublicUser>(
      `UPDATE users SET is_active = $2, updated_at = now()
       WHERE id = $1 RETURNING ${PUBLIC_COLUMNS}`,
      [id, isActive],
    );
    return rows[0] ?? null;
  },

  async setRole(id: string, role: 'admin' | 'user'): Promise<PublicUser | null> {
    const rows = await query<PublicUser>(
      `UPDATE users SET role = $2, updated_at = now()
       WHERE id = $1 RETURNING ${PUBLIC_COLUMNS}`,
      [id, role],
    );
    return rows[0] ?? null;
  },

  /** "Bulunabilirlik" bayrağını değiştirir (karar veren/şahit önerisinde çıkma). */
  async setAvailableAsPerson(id: string, value: boolean): Promise<PublicUser | null> {
    const rows = await query<PublicUser>(
      `UPDATE users SET available_as_person = $2, updated_at = now()
       WHERE id = $1 RETURNING ${PUBLIC_COLUMNS}`,
      [id, value],
    );
    return rows[0] ?? null;
  },

  /**
   * Karar veren/şahit önerisi için: bulunabilirliği açık aktif kullanıcıların
   * isimleri. Boş terim tümünü döndürür; aksi halde isimde (ILIKE) arar.
   */
  async searchAvailableNames(term: string, limit: number): Promise<string[]> {
    const trimmed = term.trim();
    if (trimmed.length === 0) {
      const rows = await query<{ full_name: string }>(
        `SELECT full_name FROM users
         WHERE is_active = true AND available_as_person = true
         ORDER BY full_name ASC LIMIT $1`,
        [limit],
      );
      return rows.map((row) => row.full_name);
    }
    const rows = await query<{ full_name: string }>(
      `SELECT full_name FROM users
       WHERE is_active = true AND available_as_person = true
         AND full_name ILIKE '%' || $1 || '%'
       ORDER BY full_name ASC LIMIT $2`,
      [trimmed, limit],
    );
    return rows.map((row) => row.full_name);
  },

  async countAdmins(): Promise<number> {
    const rows = await query<{ count: string }>(
      "SELECT count(*)::text AS count FROM users WHERE role = 'admin' AND is_active = true",
    );
    return Number(rows[0]?.count ?? 0);
  },

  /** Kullanıcının açtığı kayıt sayısı (silme engeli için). */
  async countAuthoredRecords(id: string): Promise<number> {
    const rows = await query<{ count: string }>(
      'SELECT count(*)::text AS count FROM records WHERE created_by = $1',
      [id],
    );
    return Number(rows[0]?.count ?? 0);
  },

  async remove(id: string): Promise<void> {
    await query('DELETE FROM users WHERE id = $1', [id]);
  },
};
