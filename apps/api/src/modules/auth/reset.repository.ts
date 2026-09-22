import { query } from '../../db/index.js';

interface ResetTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export const resetRepository = {
  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt.toISOString()],
    );
  },

  /** Kullanılmamış ve süresi geçmemiş token'ı özetiyle bulur. */
  async findValid(tokenHash: string): Promise<ResetTokenRow | null> {
    const rows = await query<ResetTokenRow>(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       LIMIT 1`,
      [tokenHash],
    );
    return rows[0] ?? null;
  },

  async markUsed(id: string): Promise<void> {
    await query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [id]);
  },
};
