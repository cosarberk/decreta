import type { Affect, RecordLabel, RecordPerson } from '../lib/types';
import { initials } from '../lib/format';
import { useI18n } from '../i18n/I18nContext';

/** Etkilenen alan rozeti (analiz / test / kod). */
export function AffectBadge({ affect }: { affect: Affect }): JSX.Element {
  const { t } = useI18n();
  return (
    <span className="badge-affect" data-affect={affect}>
      {t(`affect.${affect}`)}
    </span>
  );
}

/** Kaydın yürürlük durumu: ezildi mi, yürürlükte mi. */
export function StatusBadge({ superseded }: { superseded: boolean }): JSX.Element {
  const { t } = useI18n();
  return superseded ? (
    <span className="badge-affect badge-superseded">{t('status.superseded')}</span>
  ) : (
    <span className="badge-affect badge-active">{t('status.active')}</span>
  );
}

/** Dinamik etiket çipi (varsa kendi rengiyle). */
export function LabelChip({ label }: { label: RecordLabel | { name: string; color: string | null } }): JSX.Element {
  const color = label.color ?? undefined;
  return (
    <span className="chip" style={color ? { color, borderColor: color } : undefined}>
      <span className="chip-dot" />
      {label.name}
    </span>
  );
}

/** İsim + baş harf avatarıyla kişi satırı. */
export function PersonLine({ person }: { person: RecordPerson }): JSX.Element {
  return (
    <div className="person-line">
      <span className="person-avatar">{initials(person.fullName)}</span>
      {person.fullName}
    </div>
  );
}
