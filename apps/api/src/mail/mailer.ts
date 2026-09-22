import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config/index.js';

let transporter: Transporter | null = null;

/** Yapılandırılmışsa tek bir SMTP taşıyıcısı döndürür, aksi halde null. */
function getTransporter(): Transporter | null {
  if (!config.mail.enabled) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth:
        config.mail.user && config.mail.pass
          ? { user: config.mail.user, pass: config.mail.pass }
          : undefined,
    });
  }
  return transporter;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * E-postayı best-effort gönderir. SMTP yapılandırılmamışsa ya da hata olursa
 * çağıran akışı ASLA bozmaz; yalnızca sonucu döndürür/loglar.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const tx = getTransporter();
  if (!tx) {
    console.warn(`[mail] SMTP yapılandırılmadı, atlanıyor: "${message.subject}" -> ${message.to}`);
    return false;
  }
  try {
    await tx.sendMail({
      from: config.mail.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return true;
  } catch (error) {
    console.error(`[mail] Gönderilemedi (${message.to}):`, (error as Error).message);
    return false;
  }
}

/**
 * Sabit marka çerçevesi (üst/alt bilgi). Şablon gövdesi bunun içine yerleşir.
 * `title` verilirse gövdenin üstüne başlık eklenir.
 */
export function renderEmail(title: string, bodyHtml: string): string {
  const heading = title ? `<h2 style="margin:0 0 12px;font-size:18px">${title}</h2>` : '';
  return `<!doctype html><html><body style="margin:0;background:#f5f4f0;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1b1c1e">
  <div style="max-width:520px;margin:24px auto;background:#fff;border:1px solid #e4e2db;border-radius:8px;overflow:hidden">
    <div style="background:#1f3a5f;color:#fff;padding:16px 24px;font-weight:600;font-size:18px">Decreta</div>
    <div style="padding:24px">
      ${heading}
      ${bodyHtml}
    </div>
    <div style="padding:14px 24px;border-top:1px solid #e4e2db;color:#8b8d93;font-size:12px">
      Bu e-posta Decreta karar kayıt defteri tarafından gönderildi.
    </div>
  </div></body></html>`;
}

/** E-posta içinde kullanılacak birincil buton (link). */
export function emailButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#1f3a5f;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">${label}</a>`;
}
