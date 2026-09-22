import { config } from '../../config/index.js';
import { sendMail } from '../../mail/mailer.js';
import { usersRepository } from '../users/index.js';
import { emailTemplatesService } from '../email-templates/index.js';

function refLabel(refNo: number): string {
  return `DCR-${String(refNo).padStart(4, '0')}`;
}

function recordUrl(recordId: string): string {
  return `${config.publicUrl}/records/${recordId}`;
}

/**
 * Aktif kullanıcılara (işlemi yapan hariç) DB şablonundan üretilmiş bildirim
 * gönderir. Best-effort: SMTP kapalıysa ya da hata olursa çağıran akış etkilenmez.
 */
async function notifyWithTemplate(
  actorId: string,
  templateKey: string,
  vars: Record<string, string>,
): Promise<void> {
  try {
    const recipients = await usersRepository.listActiveRecipients(actorId);
    if (recipients.length === 0) return;
    const { subject, html, text } = await emailTemplatesService.render(templateKey, vars);
    await Promise.allSettled(
      recipients.map((r) => sendMail({ to: r.email, subject, html, text })),
    );
  } catch (error) {
    console.error('[notify] gönderim hatası:', (error as Error).message);
  }
}

export const notificationsService = {
  /** Yeni bir karar kaydı açıldığında. */
  notifyRecordCreated(
    record: { id: string; refNo: number; decision: string; createdBy: { fullName: string } },
    actorId: string,
  ): void {
    void notifyWithTemplate(actorId, 'record_created', {
      actorName: record.createdBy.fullName,
      decision: record.decision,
      refNo: refLabel(record.refNo),
      url: recordUrl(record.id),
    });
  },

  /** Bir karara bağlantı eklendiğinde. */
  notifyLinkAdded(
    record: { id: string; refNo: number; decision: string },
    actorName: string,
    actorId: string,
  ): void {
    void notifyWithTemplate(actorId, 'link_added', {
      actorName,
      decision: record.decision,
      refNo: refLabel(record.refNo),
      url: recordUrl(record.id),
    });
  },
};
