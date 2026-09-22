/** Aktif biçimlendirme yerel ayarı (i18n diline göre güncellenir). */
let locale = 'tr-TR';

const LOCALE_MAP: Record<string, string> = { tr: 'tr-TR', en: 'en-US' };

/** i18n dili değiştiğinde tarih/sayı biçimlerini o dile geçirir. */
export function setFormatLocale(lang: string): void {
  locale = LOCALE_MAP[lang] ?? 'tr-TR';
}

/** Ref numarasını resmî evrak biçimine getirir: 12 -> "DCR-0012". */
export function formatRefNo(refNo: number): string {
  return `DCR-${String(refNo).padStart(4, '0')}`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

/** İsim soyisimden baş harfleri üretir ("Ayşe Yılmaz" -> "AY"). */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toLocaleUpperCase('tr');
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toLocaleUpperCase('tr');
}
