import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, type ActivityFilters } from '../lib/queries';
import type { ActivityItem } from '../lib/types';
import { useI18n } from '../i18n/I18nContext';
import { formatDateTime } from '../lib/format';

type Category = 'create' | 'update' | 'delete' | 'link' | 'supersede' | 'mail';

const CATEGORY: Record<string, Category> = {
  record_created: 'create',
  record_superseded: 'supersede',
  link_added: 'link',
  link_removed: 'delete',
  mail_sent: 'mail',
  label_created: 'create',
  label_updated: 'update',
  label_deleted: 'delete',
  module_created: 'create',
  module_updated: 'update',
  module_deleted: 'delete',
  link_type_created: 'create',
  link_type_updated: 'update',
  link_type_deleted: 'delete',
  user_created: 'create',
  user_updated: 'update',
  user_deleted: 'delete',
  user_activated: 'create',
  user_deactivated: 'delete',
  user_role_changed: 'update',
};

const PAGE_SIZE = 50;

export function ActivityPage(): JSX.Element {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<ActivityFilters>({
    q: '',
    action: null,
    dateFrom: null,
    dateTo: null,
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const h = setTimeout(() => setFilters((p) => ({ ...p, q: searchText, page: 1 })), 250);
    return () => clearTimeout(h);
  }, [searchText]);

  const actionsQuery = useQuery({ queryKey: ['activity-actions'], queryFn: api.listActivityActions });
  const activityQuery = useQuery({
    queryKey: ['activity', filters],
    queryFn: () => api.searchActivity(filters),
    placeholderData: keepPreviousData,
  });

  const update = (patch: Partial<ActivityFilters>): void =>
    setFilters((p) => ({ ...p, ...patch, page: 1 }));

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const csv = await api.exportActivityCsv({
        q: filters.q,
        action: filters.action,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
      const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decreta-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const data = activityQuery.data;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('activity.title')}</h1>
          <p className="page-subtitle">{t('activity.subtitle')}</p>
        </div>
        <button type="button" className="btn" onClick={handleExport} disabled={exporting}>
          {exporting ? t('activity.exporting') : `↓ ${t('activity.export')}`}
        </button>
      </div>

      <div className="activity-toolbar">
        <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
          <span className="search-icon">⌕</span>
          <input
            className="input"
            placeholder={t('activity.searchPlaceholder')}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <select
          className="select"
          style={{ maxWidth: 200 }}
          value={filters.action ?? ''}
          onChange={(e) => update({ action: e.target.value || null })}
        >
          <option value="">{t('activity.allActions')}</option>
          {(actionsQuery.data ?? []).map((a) => (
            <option key={a} value={a}>
              {a === 'mail_sent' ? t('activity.mailFilter') : a.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input"
          style={{ maxWidth: 150 }}
          onChange={(e) => update({ dateFrom: e.target.value ? `${e.target.value}T00:00:00.000Z` : null })}
        />
        <input
          type="date"
          className="input"
          style={{ maxWidth: 150 }}
          onChange={(e) => update({ dateTo: e.target.value ? `${e.target.value}T23:59:59.999Z` : null })}
        />
        <span className="result-count">{data ? t('activity.count', { n: data.total }) : '—'}</span>
      </div>

      {activityQuery.isLoading ? (
        <div className="card state-block">{t('common.loading')}</div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="card log-list">
            {data.items.map((item) => (
              <LogRow key={item.id} item={item} onOpen={navigate} />
            ))}
          </div>
          {data.pageCount > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="btn btn-sm"
                disabled={filters.page <= 1}
                onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
              >
                {t('records.prev')}
              </button>
              <span className="page-info">
                {filters.page} / {data.pageCount}
              </span>
              <button
                type="button"
                className="btn btn-sm"
                disabled={filters.page >= data.pageCount}
                onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
              >
                {t('records.next')}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card state-block">{t('activity.empty')}</div>
      )}
    </>
  );
}

function LogRow({
  item,
  onOpen,
}: {
  item: ActivityItem;
  onOpen: (to: string) => void;
}): JSX.Element {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY[item.action] ?? 'update';
  const sentence = t(`activity.action.${item.action}`, { actor: item.actor_name });
  const label = sentence.startsWith('activity.action.')
    ? t('activity.action.unknown', { actor: item.actor_name })
    : sentence;

  // Mail satırı: tıklayınca kayda gitmez, kişi başı sonucu açıp kapar.
  const isMail = item.action === 'mail_sent';
  const recipients = item.details ?? [];
  const hasRecipients = isMail && recipients.length > 0;
  const clickable = hasRecipients || Boolean(item.record_id);

  const handleClick = (): void => {
    if (hasRecipients) setExpanded((v) => !v);
    else if (item.record_id) onOpen(`/records/${item.record_id}`);
  };

  return (
    <>
      <div
        className={`log-row${clickable ? ' clickable' : ''}`}
        onClick={clickable ? handleClick : undefined}
      >
        <span className="log-time">{formatDateTime(item.created_at)}</span>
        <span className={`log-tag log-cat-${cat}`}>{t(`activity.cat.${cat}`)}</span>
        <span className="log-text">
          {label}
          {item.target_ref && <span className="log-ref">{item.target_ref}</span>}
          {item.target_text && <span className="log-detail">{item.target_text}</span>}
          {hasRecipients && <span className="log-caret">{expanded ? '▾' : '▸'}</span>}
        </span>
      </div>
      {hasRecipients && expanded && (
        <ul className="mail-recipients">
          {recipients.map((r, i) => (
            <li key={`${r.email}-${i}`} className={`mail-recipient ${r.ok ? 'ok' : 'fail'}`}>
              <span className="mail-recipient-status">{r.ok ? '✓' : '✗'}</span>
              <span className="mail-recipient-name">{r.name}</span>
              <span className="mail-recipient-email">{r.email}</span>
              <span className="mail-recipient-state">
                {r.ok ? t('activity.mailOk') : t('activity.mailFail')}
                {!r.ok && r.error ? ` — ${r.error}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
