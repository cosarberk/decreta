import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/queries';
import { AffectBadge, LabelChip, StatusBadge } from './atoms';
import { useI18n } from '../i18n/I18nContext';
import { formatDateTime, formatRefNo } from '../lib/format';

/**
 * Sağdan açılan bağlam paneli: seçilen bir kaydın özetini gösterir.
 * Linkleme sırasında "bu bağladığım kayıt neydi?" sorusunu yerinde cevaplar.
 */
export function RecordSidePanel({
  recordId,
  onClose,
}: {
  recordId: string | null;
  onClose: () => void;
}): JSX.Element | null {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ['record', recordId],
    queryFn: () => api.getRecord(recordId as string),
    enabled: Boolean(recordId),
  });

  if (!recordId) return null;

  return (
    <>
      <div className="side-overlay" onClick={onClose} />
      <aside className="side-panel">
        <div className="side-panel-head">
          <div className="row" style={{ gap: 10 }}>
            {data && <span className="ref-no">{formatRefNo(data.refNo)}</span>}
            {data && <StatusBadge superseded={data.isSuperseded} />}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>

        {isLoading || !data ? (
          <div className="state-block">{t('common.loading')}</div>
        ) : (
          <div className="side-panel-body">
            <div className="affects-row" style={{ marginBottom: 12 }}>
              {data.affects.map((affect) => (
                <AffectBadge key={affect} affect={affect} />
              ))}
            </div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, marginBottom: 10 }}>
              {data.decision}
            </h3>
            <div className="detail-section-title">{t('sidePanel.rationale')}</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 4, whiteSpace: 'pre-wrap' }}>
              {data.rationale}
            </p>

            {data.modules.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="detail-section-title">{t('sidePanel.modules')}</div>
                <div className="labels-row" style={{ marginTop: 6 }}>
                  {data.modules.map((module) => (
                    <span key={module.id} className="chip">
                      {module.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.labels.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="detail-section-title">{t('sidePanel.labels')}</div>
                <div className="labels-row" style={{ marginTop: 6 }}>
                  {data.labels.map((label) => (
                    <LabelChip key={label.id} label={label} />
                  ))}
                </div>
              </div>
            )}

            <div className="side-panel-meta">
              <div>
                <span className="muted">{t('sidePanel.deciders')}: </span>
                {data.deciders.map((p) => p.fullName).join(', ') || '—'}
              </div>
              <div>
                <span className="muted">{t('sidePanel.createdBy')}: </span>
                {data.createdBy.fullName}
              </div>
              <div>
                <span className="muted">{t('sidePanel.date')}: </span>
                {formatDateTime(data.createdAt)}
              </div>
            </div>

            <Link
              to={`/records/${data.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm"
              style={{ marginTop: 8 }}
            >
              {t('sidePanel.open')}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
