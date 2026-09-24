import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/queries';
import { ApiError } from '../lib/api';
import { AFFECTS, type Affect } from '../lib/types';
import { TokenInput } from '../components/TokenInput';
import { LinkComposer, type AddLinkPayload } from '../components/LinkComposer';
import { RecordSidePanel } from '../components/RecordSidePanel';
import { AffectBadge } from '../components/atoms';
import { useConfirm } from '../components/ConfirmProvider';
import { useI18n } from '../i18n/I18nContext';
import { formatRefNo } from '../lib/format';

interface StagedLink {
  toRecordId: string;
  linkTypeId: string;
  recordLabel: string;
  typeLabel: string;
}

export function NewRecordPage(): JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const confirm = useConfirm();
  const [searchParams] = useSearchParams();
  const initialSupersedesId = searchParams.get('supersedes');

  const [decision, setDecision] = useState('');
  const [rationale, setRationale] = useState('');
  const [affects, setAffects] = useState<Affect[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [deciders, setDeciders] = useState<string[]>([]);
  const [witnesses, setWitnesses] = useState<string[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [links, setLinks] = useState<StagedLink[]>([]);
  const [panelId, setPanelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const linkTypesQuery = useQuery({ queryKey: ['link-types'], queryFn: api.listLinkTypes });

  // ?supersedes=<id> ile gelindiyse o kayda otomatik bir "ezme" bağı hazırla.
  const initialRecord = useQuery({
    queryKey: ['record', initialSupersedesId],
    queryFn: () => api.getRecord(initialSupersedesId as string),
    enabled: Boolean(initialSupersedesId),
  });
  useEffect(() => {
    const rec = initialRecord.data;
    const supersedeType = linkTypesQuery.data?.find((t) => t.is_supersede);
    if (rec && supersedeType && links.length === 0) {
      setLinks([
        {
          toRecordId: rec.id,
          linkTypeId: supersedeType.id,
          recordLabel: `${formatRefNo(rec.refNo)} — ${rec.decision.slice(0, 60)}`,
          typeLabel: supersedeType.forward_name,
        },
      ]);
    }
  }, [initialRecord.data, linkTypesQuery.data, links.length]);

  const mutation = useMutation({
    mutationFn: () =>
      api.createRecord({
        decision,
        rationale,
        affects,
        modules,
        deciders,
        witnesses,
        labels,
        links: links.map((l) => ({ toRecordId: l.toRecordId, linkTypeId: l.linkTypeId })),
      }),
    onSuccess: (record) => {
      void queryClient.invalidateQueries({ queryKey: ['records'] });
      void queryClient.invalidateQueries({ queryKey: ['labels'] });
      void queryClient.invalidateQueries({ queryKey: ['modules'] });
      navigate(`/records/${record.id}`, { replace: true });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t('newRecord.createError')),
  });

  const toggleAffect = (affect: Affect): void => {
    setAffects((prev) => (prev.includes(affect) ? prev.filter((a) => a !== affect) : [...prev, affect]));
  };

  const addLink = (payload: AddLinkPayload): void => {
    setLinks((prev) => [...prev, payload]);
  };
  const removeLink = (index: number): void => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const canSubmit = decision.trim().length > 0 && rationale.trim().length > 0 && affects.length > 0;

  const fetchModuleSuggestions = useMemo(
    () => async (query: string): Promise<string[]> => {
      const all = await api.listModules();
      const names = all.map((m) => m.name);
      if (query.trim().length === 0) return names.slice(0, 20);
      return names.filter((n) => n.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')));
    },
    [],
  );
  const fetchLabelSuggestions = useMemo(
    () => async (query: string): Promise<string[]> => {
      const all = await api.listLabels();
      const names = all.map((l) => l.name);
      if (query.trim().length === 0) return names.slice(0, 20);
      return names.filter((n) => n.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')));
    },
    [],
  );

  // "Kaydı oluştur" artık doğrudan kaydetmez; önce salt-okunur önizlemeyi açar.
  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    setError(null);
    if (!canSubmit) {
      setError(t('newRecord.validation'));
      return;
    }
    setShowPreview(true);
  };

  // Önizlemedeki "Kaydet": geri alınamazlık uyarısı onaylanırsa kaydı oluşturur.
  const handleConfirmedSave = async (): Promise<void> => {
    const ok = await confirm({
      title: t('newRecord.confirmTitle'),
      message: t('newRecord.confirmMessage'),
      confirmLabel: t('newRecord.confirmSave'),
      danger: true,
    });
    if (ok) mutation.mutate();
  };

  return (
    <>
      <div className="form-wrap">
        <div className="page-head">
          <div>
            <h1 className="page-title">{t('newRecord.title')}</h1>
            <p className="page-subtitle">{t('newRecord.subtitle')}</p>
          </div>
        </div>

        <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          {error && <div className="form-error">{error}</div>}

          <div className="field">
            <label htmlFor="decision">{t('newRecord.decision')}</label>
            <textarea
              id="decision"
              className="textarea"
              placeholder={t('newRecord.decisionPlaceholder')}
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="rationale">{t('newRecord.rationale')}</label>
            <textarea
              id="rationale"
              className="textarea"
              placeholder={t('newRecord.rationalePlaceholder')}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
            />
          </div>

          <div className="form-row-2">
            <div className="field">
              <label>{t('newRecord.affects')}</label>
              <div className="affect-toggle-group">
                {AFFECTS.map((affect) => (
                  <button
                    key={affect}
                    type="button"
                    className="affect-toggle"
                    data-affect={affect}
                    aria-pressed={affects.includes(affect)}
                    onClick={() => toggleAffect(affect)}
                  >
                    {affect}
                  </button>
                ))}
              </div>
              <span className="hint">{t('newRecord.affectsHint')}</span>
            </div>

            <div className="field">
              <label>{t('newRecord.modules')}</label>
              <TokenInput
                values={modules}
                onChange={setModules}
                placeholder={t('newRecord.modulesPlaceholder')}
                fetchSuggestions={fetchModuleSuggestions}
              />
              <span className="hint">{t('newRecord.modulesHint')}</span>
            </div>
          </div>

          <div className="field">
            <label>{t('newRecord.deciders')}</label>
            <TokenInput
              values={deciders}
              onChange={setDeciders}
              placeholder={t('newRecord.personPlaceholder')}
              fetchSuggestions={api.searchPersonSuggestions}
            />
          </div>

          <div className="field">
            <label>{t('newRecord.witnesses')}</label>
            <TokenInput
              values={witnesses}
              onChange={setWitnesses}
              placeholder={t('newRecord.personPlaceholder')}
              fetchSuggestions={api.searchPersonSuggestions}
            />
          </div>

          <div className="field">
            <label>{t('newRecord.labels')}</label>
            <TokenInput
              values={labels}
              onChange={setLabels}
              placeholder={t('newRecord.labelsPlaceholder')}
              fetchSuggestions={fetchLabelSuggestions}
            />
          </div>

          <div className="field">
            <label>{t('newRecord.links')}</label>
            <LinkComposer
              linkTypes={linkTypesQuery.data ?? []}
              excludeIds={links.map((l) => l.toRecordId)}
              onAdd={addLink}
            />
            {links.length > 0 && (
              <table className="links-table">
                <tbody>
                  {links.map((link, index) => (
                    <tr key={`${link.toRecordId}-${link.linkTypeId}`}>
                      <td style={{ width: 90 }}>
                        <span className="chip">{link.typeLabel}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="link-cell"
                          onClick={() => setPanelId(link.toRecordId)}
                        >
                          {link.recordLabel}
                        </button>
                      </td>
                      <td style={{ width: 40, textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeLink(index)}
                          aria-label="Kaldır"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <span className="hint">{t('newRecord.linksHint')}</span>
          </div>

          <div className="form-actions">
            <button type="button" className="btn" onClick={() => navigate(-1)}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending ? t('newRecord.submitting') : t('newRecord.submit')}
            </button>
          </div>
        </div>
        </form>
      </div>

      {showPreview && (
        <>
          <div className="side-overlay" onClick={() => setShowPreview(false)} />
          <div
            className="preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t('newRecord.preview')}
          >
            <div className="preview-title">{t('newRecord.preview')}</div>
            <p className="preview-hint">{t('newRecord.previewHint')}</p>

            {error && <div className="form-error">{error}</div>}

            <div className="preview-item">
              <div className="preview-item-label">{t('newRecord.decision')}</div>
              <div className="preview-item-value">{decision}</div>
            </div>

            <div className="preview-item">
              <div className="preview-item-label">{t('newRecord.rationale')}</div>
              <div className="preview-item-value">{rationale}</div>
            </div>

            <div className="preview-item">
              <div className="preview-item-label">{t('newRecord.affects')}</div>
              <div className="preview-chips">
                {affects.map((a) => (
                  <AffectBadge key={a} affect={a} />
                ))}
              </div>
            </div>

            {modules.length > 0 && (
              <div className="preview-item">
                <div className="preview-item-label">{t('newRecord.modules')}</div>
                <div className="preview-chips">
                  {modules.map((m) => (
                    <span key={m} className="chip">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="preview-item">
              <div className="preview-item-label">{t('newRecord.deciders')}</div>
              {deciders.length > 0 ? (
                <div className="preview-chips">
                  {deciders.map((d) => (
                    <span key={d} className="chip">
                      {d}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="preview-item-value preview-empty">{t('newRecord.empty')}</div>
              )}
            </div>

            {witnesses.length > 0 && (
              <div className="preview-item">
                <div className="preview-item-label">{t('newRecord.witnesses')}</div>
                <div className="preview-chips">
                  {witnesses.map((w) => (
                    <span key={w} className="chip">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {labels.length > 0 && (
              <div className="preview-item">
                <div className="preview-item-label">{t('newRecord.labels')}</div>
                <div className="preview-chips">
                  {labels.map((l) => (
                    <span key={l} className="chip">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {links.length > 0 && (
              <div className="preview-item">
                <div className="preview-item-label">{t('newRecord.links')}</div>
                <div className="preview-chips">
                  {links.map((l) => (
                    <span key={`${l.toRecordId}-${l.linkTypeId}`} className="chip">
                      {l.typeLabel}: {l.recordLabel}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="preview-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setShowPreview(false)}
                disabled={mutation.isPending}
              >
                {t('newRecord.backToEdit')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmedSave}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? t('newRecord.submitting') : t('newRecord.save')}
              </button>
            </div>
          </div>
        </>
      )}

      <RecordSidePanel recordId={panelId} onClose={() => setPanelId(null)} />
    </>
  );
}
