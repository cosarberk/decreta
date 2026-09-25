import { config } from '../../config/index.js';
import { sendMail } from '../../mail/mailer.js';
import { usersRepository } from '../users/index.js';
import { emailTemplatesService } from '../email-templates/index.js';
import { activityService } from '../activity/index.js';
import type { MailRecipientResult } from '../activity/activity.repository.js';

/** Mail gönderimini activity_log'a yazarken kullanılacak bağlam. */
interface NotifyContext {
  actorName: string;
  recordId: string | null;
  targetRef: string | null;
}

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
  ctx: NotifyContext,
): Promise<void> {
  try {
    const recipients = await usersRepository.listActiveRecipients(actorId);
    if (recipients.length === 0) return;
    const { subject, html, text } = await emailTemplatesService.render(templateKey, vars);
    const results = await Promise.allSettled(
      recipients.map((r) => sendMail({ to: r.email, subject, html, text })),
    );

    // Kişi başı sonucu çıkar: kime iletildi, kime iletilemedi (+ hata).
    const details: MailRecipientResult[] = recipients.map((r, i) => {
      const res = results[i];
      if (res && res.status === 'fulfilled') {
        const { ok, error } = res.value;
        return { email: r.email, name: r.full_name, ok, ...(ok || !error ? {} : { error }) };
      }
      const error =
        res && res.status === 'rejected'
          ? ((res.reason as Error)?.message ?? 'bilinmeyen hata')
          : 'bilinmeyen hata';
      return { email: r.email, name: r.full_name, ok: false, error };
    });

    const okCount = details.filter((d) => d.ok).length;
    const failCount = details.length - okCount;
    const targetText =
      failCount === 0
        ? `${details.length} alıcı · ${okCount} iletildi`
        : `${details.length} alıcı · ${okCount} iletildi · ${failCount} başarısız`;

    // Gönderim başına tek özet satır; kişi başı ayrıntı `details`te.
    void activityService.log({
      action: 'mail_sent',
      actorId,
      actorName: ctx.actorName,
      targetRef: ctx.targetRef,
      targetText,
      recordId: ctx.recordId,
      details,
    });
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
    void notifyWithTemplate(
      actorId,
      'record_created',
      {
        actorName: record.createdBy.fullName,
        decision: record.decision,
        refNo: refLabel(record.refNo),
        url: recordUrl(record.id),
      },
      { actorName: record.createdBy.fullName, recordId: record.id, targetRef: refLabel(record.refNo) },
    );
  },

  /** Bir karara bağlantı eklendiğinde. */
  notifyLinkAdded(
    record: { id: string; refNo: number; decision: string },
    actorName: string,
    actorId: string,
  ): void {
    void notifyWithTemplate(
      actorId,
      'link_added',
      {
        actorName,
        decision: record.decision,
        refNo: refLabel(record.refNo),
        url: recordUrl(record.id),
      },
      { actorName, recordId: record.id, targetRef: refLabel(record.refNo) },
    );
  },
};
