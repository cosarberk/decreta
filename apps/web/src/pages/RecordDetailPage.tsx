import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/queries';
import { ApiError } from '../lib/api';
import { AffectBadge, LabelChip, PersonLine, StatusBadge } from '../components/atoms';
import { LinkComposer, type AddLinkPayload } from '../components/LinkComposer';
import { RecordSidePanel } from '../components/RecordSidePanel';
import { useI18n } from '../i18n/I18nContext';
import type { RecordLinkView } from '../lib/types';
import { formatDateTime, formatRefNo } from '../lib/format';

export function RecordDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [panelId, setPanelId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const { data: record, isLoading, isError } = useQuery({
    queryKey: ['record', id],
    queryFn: () => api.getRecord(id as string),
    enabled: Boolean(id),
  });
  const linkTypesQuery = useQuery({ queryKey: ['link-types'], queryFn: api.listLinkTypes });

  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['record', id] });
    void queryClient.invalidateQueries({ queryKey: ['records'] });
  };

  const addMutation = useMutation({
    mutationFn: (payload: AddLinkPayload) =>
      api.addLink(id as string, { toRecordId: payload.toRecordId, linkTypeId: payload.linkTypeId }),
    onSuccess: refresh,
    onError: (err) => setLinkError(err instanceof ApiError ? err.message : t('detail.addLinkError')),
  });
  const removeMutation = useMutation({
    mutationFn: (linkId: string) => api.removeLink(id as string, linkId),
    onSuccess: refresh,
    onError: (err) => setLinkError(err instanceof ApiError ? err.message : t('detail.removeLinkError')),
  });

  if (isLoading) return <div className="card state-block">{t('common.loading')}</div>;
  if (isError || !record) return <div className="card state-block">{t('detail.notFound')}</div>;

  const excludeIds = [record.id, ...record.links.map((l) => l.record.id)];

  return (
    <>
      <div className="detail-wrap">
        <div className="page-head">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            {t('common.back')}
          </button>
          <Link to={`/records/new?supersedes=${record.id}`} className="btn btn-primary">
            {t('detail.supersedeBtn')}
          </Link>
        </div>

        <article className="card detail-doc">
        <header className="detail-head">
          <div className="detail-head-top">
            <span className="ref-no">{formatRefNo(record.refNo)}</span>
            <StatusBadge superseded={record.isSuperseded} />
            {record.affects.map((affect) => (
              <AffectBadge key={affect} affect={affect} />
            ))}
          </div>

          {record.isSuperseded && (
            <div className="chain-banner superseded">{t('detail.supersededBanner')}</div>
          )}

          <h1 className="detail-decision">{record.decision}</h1>
        </header>

        <div className="detail-body">
          <section>
            <div className="detail-section-title">{t('detail.rationale')}</div>
            <p className="detail-rationale">{record.rationale}</p>
          </section>

          {record.modules.length > 0 && (
            <section>
              <div className="detail-section-title">{t('detail.modules')}</div>
              <div className="labels-row">
                {record.modules.map((module) => (
                  <span key={module.id} className="chip">
                    {module.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="detail-people">
            <div>
              <div className="detail-section-title">{t('detail.deciders')}</div>
              {record.deciders.length > 0 ? (
                <div className="people-list">
                  {record.deciders.map((person) => (
                    <PersonLine key={person.id} person={person} />
                  ))}
                </div>
              ) : (
                <span className="muted">—</span>
              )}
            </div>
            <div>
              <div className="detail-section-title">{t('detail.witnesses')}</div>
              {record.witnesses.length > 0 ? (
                <div className="people-list">
                  {record.witnesses.map((person) => (
                    <PersonLine key={person.id} person={person} />
                  ))}
                </div>
              ) : (
                <span className="muted">—</span>
              )}
            </div>
          </section>

          {record.labels.length > 0 && (
            <section>
              <div className="detail-section-title">{t('detail.labels')}</div>
              <div className="labels-row">
                {record.labels.map((label) => (
                  <LabelChip key={label.id} label={label} />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="detail-section-title">{t('detail.links')}</div>
            {linkError && <div className="form-error" style={{ marginBottom: 10 }}>{linkError}</div>}
            {record.links.length > 0 ? (
              <table className="links-table">
                <tbody>
                  {record.links.map((link) => (
                    <LinkRow
                      key={link.id}
                      link={link}
                      onOpen={() => setPanelId(link.record.id)}
                      onRemove={() => removeMutation.mutate(link.id)}
                    />
                  ))}
                </tbody>
              </table>
            ) : (
              <span className="muted" style={{ fontSize: 13 }}>
                {t('detail.noLinks')}
              </span>
            )}
            <div style={{ marginTop: 12 }}>
              <LinkComposer
                linkTypes={linkTypesQuery.data ?? []}
                excludeIds={excludeIds}
                onAdd={(payload) => addMutation.mutate(payload)}
                busy={addMutation.isPending}
              />
            </div>
          </section>
        </div>

        <footer className="detail-meta-grid">
          <div className="meta-item">
            <div className="k">{t('detail.createdBy')}</div>
            <div className="v">{record.createdBy.fullName}</div>
          </div>
          <div className="meta-item">
            <div className="k">{t('detail.date')}</div>
            <div className="v">{formatDateTime(record.createdAt)}</div>
          </div>
          <div className="meta-item">
            <div className="k">{t('detail.moduleCount')}</div>
            <div className="v">{record.modules.length}</div>
          </div>
          <div className="meta-item">
            <div className="k">{t('detail.refNo')}</div>
            <div className="v ref-no">{formatRefNo(record.refNo)}</div>
          </div>
          </footer>
        </article>
      </div>

      <RecordSidePanel recordId={panelId} onClose={() => setPanelId(null)} />
    </>
  );
}

function LinkRow({
  link,
  onOpen,
  onRemove,
}: {
  link: RecordLinkView;
  onOpen: () => void;
  onRemove: () => void;
}): JSX.Element {
  const { t } = useI18n();
  const color = link.color ?? undefined;
  return (
    <tr>
      <td style={{ width: 120, verticalAlign: 'top' }}>
        <span className="chip" style={color ? { color, borderColor: color } : undefined}>
          {link.typeLabel}
        </span>
      </td>
      <td>
        <button type="button" className="link-cell" onClick={onOpen}>
          <span className="ref-no">{formatRefNo(link.record.refNo)}</span> — {link.record.decision}
        </button>
        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
          {t('common.linkedBy', { name: link.by })}
        </div>
      </td>
      <td style={{ width: 40, textAlign: 'right', verticalAlign: 'top' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRemove} aria-label={t('common.remove')}>
          ×
        </button>
      </td>
    </tr>
  );
}
