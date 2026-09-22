import { config } from '../../config/index.js';
import { sendMail } from '../../mail/mailer.js';
import { authService } from '../auth/index.js';
import { emailTemplatesService } from '../email-templates/index.js';
import { usersRepository, type PublicUser } from '../users/index.js';

export interface BulkMailResult {
  sent: number;
  failed: number;
  skipped: number;
}

function roleLabel(user: PublicUser): string {
  return user.role === 'admin' ? 'Yönetici' : 'Kullanıcı';
}

export const accountService = {
  /**
   * Seçili kullanıcılara hesap bilgilerini gönderir (DB şablonundan üretilir).
   * Parola içermez (hash'li olduğu için gönderilemez).
   */
  async sendInfo(userIds: readonly string[]): Promise<BulkMailResult> {
    const users = await usersRepository.listByIds(userIds);
    const loginUrl = `${config.publicUrl}/login`;
    let sent = 0;
    let failed = 0;
    for (const user of users) {
      const { subject, html, text } = await emailTemplatesService.render('user_info', {
        fullName: user.full_name,
        email: user.email,
        role: roleLabel(user),
        loginUrl,
      });
      const ok = await sendMail({ to: user.email, subject, html, text });
      ok ? (sent += 1) : (failed += 1);
    }
    return { sent, failed, skipped: userIds.length - users.length };
  },

  /** Seçili kullanıcılara tek kullanımlık parola sıfırlama bağlantısı gönderir. */
  async sendReset(userIds: readonly string[]): Promise<BulkMailResult> {
    const users = await usersRepository.listByIds(userIds);
    let sent = 0;
    let failed = 0;
    for (const user of users) {
      const token = await authService.createResetToken(user.id);
      const resetUrl = `${config.publicUrl}/reset?token=${token}`;
      const { subject, html, text } = await emailTemplatesService.render('password_reset', {
        fullName: user.full_name,
        resetUrl,
      });
      const ok = await sendMail({ to: user.email, subject, html, text });
      ok ? (sent += 1) : (failed += 1);
    }
    return { sent, failed, skipped: userIds.length - users.length };
  },
};
