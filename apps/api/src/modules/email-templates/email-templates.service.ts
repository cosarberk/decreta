import { query } from '../../db/index.js';
import { AppError } from '../../lib/index.js';
import { renderEmail } from '../../mail/mailer.js';

export interface EmailTemplateRow {
  key: string;
  subject: string;
  body_html: string;
  updated_at: string;
}

/** Şablon türü başına kullanılabilir değişkenler (admin editöründe gösterilir). */
export const TEMPLATE_VARIABLES: Record<string, string[]> = {
  record_created: ['actorName', 'decision', 'refNo', 'url'],
  link_added: ['actorName', 'decision', 'refNo', 'url'],
  user_info: ['fullName', 'email', 'role', 'loginUrl'],
  password_reset: ['fullName', 'resetUrl'],
};

/** {{degisken}} yer tutucularını değerlerle doldurur (eksikse boş bırakır). */
function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => vars[name] ?? '');
}

/** HTML gövdeden düz metin türetir (text/plain alternatifi için). */
function toText(html: string): string {
  return html
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2: $1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const emailTemplatesService = {
  async list(): Promise<(EmailTemplateRow & { variables: string[] })[]> {
    const rows = await query<EmailTemplateRow>('SELECT * FROM email_templates ORDER BY key');
    return rows.map((row) => ({ ...row, variables: TEMPLATE_VARIABLES[row.key] ?? [] }));
  },

  async update(key: string, subject: string, bodyHtml: string): Promise<EmailTemplateRow> {
    const rows = await query<EmailTemplateRow>(
      `UPDATE email_templates SET subject = $2, body_html = $3, updated_at = now()
       WHERE key = $1 RETURNING *`,
      [key, subject, bodyHtml],
    );
    if (!rows[0]) throw AppError.notFound('E-posta şablonu bulunamadı');
    return rows[0];
  },

  /**
   * Şablonu değişkenlerle doldurup gönderime hazır {subject, html, text} üretir.
   * Şablon bulunamazsa (seed edilmemişse) sade bir yedek döndürür.
   */
  async render(
    key: string,
    vars: Record<string, string>,
  ): Promise<{ subject: string; html: string; text: string }> {
    const rows = await query<EmailTemplateRow>(
      'SELECT * FROM email_templates WHERE key = $1 LIMIT 1',
      [key],
    );
    const tpl = rows[0];
    const subject = tpl ? interpolate(tpl.subject, vars) : 'Decreta bildirimi';
    const body = tpl ? interpolate(tpl.body_html, vars) : '<p>Decreta bildirimi.</p>';
    return { subject, html: renderEmail('', body), text: toText(body) };
  },
};
