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

/** Gönderim sırasında her alıcı için yayınlanan ilerleme olayı. */
export interface SendProgress {
  index: number;
  total: number;
  email: string;
  name: string;
  status: 'sending' | 'sent' | 'failed';
  error?: string;
}

type ProgressFn = (p: SendProgress) => void;

function roleLabel(user: PublicUser): string {
  return user.role === 'admin' ? 'Yönetici' : 'Kullanıcı';
}

/** Alıcılar üzerinde tek tek dolaşır, her adımı `onProgress` ile yayınlar. */
async function sendToEach(
  users: PublicUser[],
  build: (user: PublicUser) => Promise<{ subject: string; html: string; text: string }>,
  onProgress?: ProgressFn,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < users.length; i += 1) {
    const user = users[i]!;
    const base = { index: i + 1, total: users.length, email: user.email, name: user.full_name };
    onProgress?.({ ...base, status: 'sending' });
    const { subject, html, text } = await build(user);
    const res = await sendMail({ to: user.email, subject, html, text });
    if (res.ok) {
      sent += 1;
      onProgress?.({ ...base, status: 'sent' });
    } else {
      failed += 1;
      onProgress?.({ ...base, status: 'failed', error: res.error });
    }
  }
  return { sent, failed };
}

export const accountService = {
  /** Seçili kullanıcılara hesap bilgilerini gönderir (DB şablonundan). */
  async sendInfo(userIds: readonly string[], onProgress?: ProgressFn): Promise<BulkMailResult> {
    const users = await usersRepository.listByIds(userIds);
    const loginUrl = `${config.publicUrl}/login`;
    const { sent, failed } = await sendToEach(
      users,
      (user) =>
        emailTemplatesService.render('user_info', {
          fullName: user.full_name,
          email: user.email,
          role: roleLabel(user),
          loginUrl,
        }),
      onProgress,
    );
    return { sent, failed, skipped: userIds.length - users.length };
  },

  /** Seçili kullanıcılara tek kullanımlık parola sıfırlama bağlantısı gönderir. */
  async sendReset(userIds: readonly string[], onProgress?: ProgressFn): Promise<BulkMailResult> {
    const users = await usersRepository.listByIds(userIds);
    const { sent, failed } = await sendToEach(
      users,
      async (user) => {
        const token = await authService.createResetToken(user.id);
        const resetUrl = `${config.publicUrl}/reset?token=${token}`;
        return emailTemplatesService.render('password_reset', {
          fullName: user.full_name,
          resetUrl,
        });
      },
      onProgress,
    );
    return { sent, failed, skipped: userIds.length - users.length };
  },
};
