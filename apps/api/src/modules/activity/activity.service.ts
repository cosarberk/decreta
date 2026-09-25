import {
  activityRepository,
  type ActivityFilters,
  type ActivityRow,
  type MailRecipientResult,
} from './activity.repository.js';

/** Kaydın açıldığı olay tipleri (frontend'de renk/çeviri için sabit anahtarlar). */
export type ActivityAction =
  | 'record_created'
  | 'record_superseded'
  | 'link_added'
  | 'link_removed'
  | 'label_created'
  | 'label_updated'
  | 'label_deleted'
  | 'module_created'
  | 'module_updated'
  | 'module_deleted'
  | 'link_type_created'
  | 'link_type_updated'
  | 'link_type_deleted'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_activated'
  | 'user_deactivated'
  | 'user_role_changed'
  | 'mail_sent';

export interface LogEntry {
  action: ActivityAction;
  actorId: string | null;
  actorName: string;
  targetRef?: string | null;
  targetText?: string | null;
  recordId?: string | null;
  details?: MailRecipientResult[] | null;
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export const activityService = {
  /** Olayı best-effort kaydeder; hata olursa çağıran akışı ASLA bozmaz. */
  async log(entry: LogEntry): Promise<void> {
    try {
      await activityRepository.insert({
        action: entry.action,
        actorId: entry.actorId,
        actorName: entry.actorName,
        targetRef: entry.targetRef ?? null,
        targetText: entry.targetText ?? null,
        recordId: entry.recordId ?? null,
        details: entry.details ?? null,
      });
    } catch (error) {
      console.error('[activity] kaydedilemedi:', (error as Error).message);
    }
  },

  async search(filters: ActivityFilters): Promise<{ items: ActivityRow[]; total: number }> {
    return activityRepository.search(filters);
  },

  async distinctActions(): Promise<string[]> {
    return activityRepository.distinctActions();
  },

  /** Filtreye uyan tüm kayıtları CSV metnine dönüştürür. */
  async exportCsv(filters: Omit<ActivityFilters, 'limit' | 'offset'>): Promise<string> {
    const rows = await activityRepository.findAll(filters);
    const header = ['tarih', 'islem', 'kisi', 'hedef', 'aciklama'].join(',');
    const lines = rows.map((r) =>
      [
        csvCell(new Date(r.created_at).toISOString()),
        csvCell(r.action),
        csvCell(r.actor_name),
        csvCell(r.target_ref),
        csvCell(r.target_text),
      ].join(','),
    );
    return `${header}\n${lines.join('\n')}\n`;
  },
};
