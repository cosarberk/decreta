import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/queries';
import type { CountRow, LabelCountRow } from '../lib/types';
import { useI18n } from '../i18n/I18nContext';
import { formatDateTime } from '../lib/format';

interface BarRow {
  label: string;
  count: number;
  color?: string;
}

export function ReportsPage(): JSX.Element {
  const { t } = useI18n();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-summary'],
    queryFn: api.getReportSummary,
  });

  if (isLoading) return <div className="card state-block">{t('common.loading')}</div>;
  if (isError || !data) return <div className="card state-block">{t('reports.empty')}</div>;

  const affectColors: Record<string, string> = {
    analiz: 'var(--affect-analiz)',
    test: 'var(--affect-test)',
    kod: 'var(--affect-kod)',
  };

  const affectRows: BarRow[] = data.byAffect.map((r) => ({
    label: t(`affect.${r.label}`),
    count: r.count,
    color: affectColors[r.label],
  }));
  const labelRows: BarRow[] = data.byLabel.map((r: LabelCountRow) => ({
    label: r.label,
    count: r.count,
    color: r.color ?? undefined,
  }));
  const toBars = (rows: CountRow[]): BarRow[] => rows.map((r) => ({ label: r.label, count: r.count }));

  return (
    <div className="report-doc">
      <div className="page-head no-print">
        <div>
          <h1 className="page-title">{t('reports.title')}</h1>
          <p className="page-subtitle">{t('reports.subtitle')}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          ↓ {t('reports.printPdf')}
        </button>
      </div>

      {/* Yazdırma başlığı (sadece PDF/çıktıda görünür) */}
      <div className="print-only report-print-head">
        <span className="wordmark" style={{ fontSize: 24 }}>
          Decreta
        </span>
        <div className="muted">
          {t('reports.title')} · {t('reports.generatedAt')}: {formatDateTime(new Date().toISOString())}
        </div>
      </div>

      <div className="report-tiles">
        <Tile label={t('reports.total')} value={data.total} />
        <Tile label={t('reports.active')} value={data.active} tone="ok" />
        <Tile label={t('reports.superseded')} value={data.superseded} tone="danger" />
      </div>

      <div className="report-grid">
        <Section title={t('reports.byAffect')} rows={affectRows} />
        <Section title={t('reports.byMonth')} rows={toBars(data.byMonth)} />
        <Section title={t('reports.byModule')} rows={toBars(data.byModule)} />
        <Section title={t('reports.byLabel')} rows={labelRows} />
        <Section title={t('reports.topDeciders')} rows={toBars(data.topDeciders)} />
        <Section title={t('reports.topCreators')} rows={toBars(data.topCreators)} />
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'ok' | 'danger';
}): JSX.Element {
  return (
    <div className="card report-tile">
      <div className={`report-tile-value${tone ? ` tone-${tone}` : ''}`}>{value}</div>
      <div className="report-tile-label">{label}</div>
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: BarRow[] }): JSX.Element {
  const { t } = useI18n();
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="card report-section">
      <div className="report-section-title">{title}</div>
      {rows.length === 0 ? (
        <span className="muted" style={{ fontSize: 13 }}>
          {t('reports.empty')}
        </span>
      ) : (
        <div className="bar-list">
          {rows.map((r) => (
            <div className="bar-row" key={r.label}>
              <span className="bar-label" title={r.label}>
                {r.label}
              </span>
              <span className="bar-track">
                <span
                  className="bar-fill"
                  style={{ width: `${(r.count / max) * 100}%`, background: r.color ?? 'var(--accent)' }}
                />
              </span>
              <span className="bar-count">{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
