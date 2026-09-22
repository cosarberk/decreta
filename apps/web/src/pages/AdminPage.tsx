import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type MailStreamEvent } from '../lib/queries';
import { ApiError } from '../lib/api';
import type { PublicUser, Role } from '../lib/types';
import { LabelChip } from '../components/atoms';
import { UserDrawer } from '../components/UserDrawer';
import { useConfirm } from '../components/ConfirmProvider';
import { useI18n } from '../i18n/I18nContext';
import { formatDate } from '../lib/format';

type Tab = 'users' | 'labels' | 'modules' | 'linkTypes' | 'emailTemplates';

const TABS: { key: Tab; labelKey: string }[] = [
  { key: 'users', labelKey: 'admin.tabUsers' },
  { key: 'modules', labelKey: 'admin.tabModules' },
  { key: 'labels', labelKey: 'admin.tabLabels' },
  { key: 'linkTypes', labelKey: 'admin.tabLinkTypes' },
  { key: 'emailTemplates', labelKey: 'admin.tabEmailTemplates' },
];

export function AdminPage(): JSX.Element {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('users');

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('admin.title')}</h1>
          <p className="page-subtitle">{t('admin.subtitle')}</p>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((item) => (
          <button
            key={item.key}
            className={`tab${tab === item.key ? ' active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'modules' && <ModulesTab />}
      {tab === 'labels' && <LabelsTab />}
      {tab === 'linkTypes' && <LinkTypesTab />}
      {tab === 'emailTemplates' && <EmailTemplatesTab />}
    </>
  );
}

function UsersTab(): JSX.Element {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: api.listUsers });
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'user' as Role });
  const [error, setError] = useState<string | null>(null);

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const createMutation = useMutation({
    mutationFn: () => api.createUser(form),
    onSuccess: () => {
      setForm({ email: '', password: '', fullName: '', role: 'user' });
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t('admin.userError')),
  });

  const activeMutation = useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) =>
      api.setUserActive(input.id, input.isActive),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : t('admin.actionError')),
  });

  const roleMutation = useMutation({
    mutationFn: (input: { id: string; role: Role }) => api.setUserRole(input.id, input.role),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : t('admin.actionError')),
  });

  const users = usersQuery.data ?? [];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mailMsg, setMailMsg] = useState<string | null>(null);

  const toggle = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const allSelected = users.length > 0 && users.every((u) => selected.has(u.id));
  const toggleAll = (): void => {
    setSelected(allSelected ? new Set() : new Set(users.map((u) => u.id)));
  };

  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<
    { email: string; name: string; status: 'sending' | 'sent' | 'failed'; error?: string }[]
  >([]);
  const mailBusy = sending;

  const runSend = async (
    stream: (ids: string[], onLine: (e: MailStreamEvent) => void) => Promise<void>,
  ): Promise<void> => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setMailMsg(null);
    setProgress([]);
    setSending(true);
    try {
      await stream(ids, (e) => {
        if (e.type === 'progress') {
          setProgress((prev) => {
            const next = prev.slice();
            const idx = next.findIndex((p) => p.email === e.email);
            const line = { email: e.email, name: e.name, status: e.status, error: e.error };
            if (idx >= 0) next[idx] = line;
            else next.push(line);
            return next;
          });
        } else if (e.type === 'done') {
          setMailMsg(t('admin.sendResult', { sent: e.sent, failed: e.failed }));
        } else if (e.type === 'error') {
          setMailMsg(e.message);
        }
      });
    } catch (err) {
      setMailMsg(err instanceof ApiError ? err.message : t('admin.actionError'));
    } finally {
      setSending(false);
    }
  };

  const confirm = useConfirm();
  const [drawerUser, setDrawerUser] = useState<PublicUser | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : t('admin.actionError')),
  });

  const askDelete = async (id: string, name: string): Promise<void> => {
    if (
      await confirm({
        message: t('common.deleteConfirm', { name }),
        danger: true,
        confirmLabel: t('common.delete'),
      })
    ) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = (event: FormEvent): void => {
    event.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="stack" style={{ gap: 24 }}>
      <form className="card" style={{ padding: 20 }} onSubmit={handleCreate}>
        <div className="filter-group-title" style={{ marginBottom: 14 }}>
          {t('admin.newUser')}
        </div>
        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}
        <div className="form-row-2" style={{ marginBottom: 14 }}>
          <div className="field">
            <label>{t('admin.fullName')}</label>
            <input
              className="input"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>{t('admin.email')}</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>{t('admin.password')}</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>{t('admin.role')}</label>
            <select
              className="select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              <option value="user">{t('admin.roleUser')}</option>
              <option value="admin">{t('admin.roleAdmin')}</option>
            </select>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
          {createMutation.isPending ? t('admin.adding') : t('admin.addUser')}
        </button>
      </form>

      <div className="bulk-toolbar">
        <span className="muted">{t('admin.selected', { n: selected.size })}</span>
        <button
          type="button"
          className="btn btn-sm"
          disabled={selected.size === 0 || mailBusy}
          onClick={() => void runSend(api.sendUserInfoStream)}
        >
          {mailBusy ? t('admin.sending') : t('admin.sendInfo')}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={selected.size === 0 || mailBusy}
          onClick={() => void runSend(api.sendUserResetStream)}
        >
          {mailBusy ? t('admin.sending') : t('admin.sendReset')}
        </button>
        {mailMsg && <span className="bulk-result">{mailMsg}</span>}
        <span className="bulk-hint muted">{t('admin.smtpHint')}</span>
      </div>

      {(sending || progress.length > 0) && (
        <div className="card send-progress">
          <div className="filter-group-title" style={{ marginBottom: 10 }}>
            {t('admin.sendProgress')}
          </div>
          <div className="send-progress-list">
            {progress.map((p) => (
              <div className={`send-line send-${p.status}`} key={p.email}>
                <span className="send-icon">
                  {p.status === 'sending' ? '⏳' : p.status === 'sent' ? '✓' : '✗'}
                </span>
                <span className="send-name">{p.name}</span>
                <span className="send-email muted">{p.email}</span>
                <span className="send-state">
                  {p.status === 'sending'
                    ? t('admin.pSending')
                    : p.status === 'sent'
                      ? t('admin.pSent')
                      : `${t('admin.pFailed')}${p.error ? `: ${p.error}` : ''}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label={t('admin.selectAll')}
                />
              </th>
              <th>{t('admin.fullName')}</th>
              <th>{t('admin.email')}</th>
              <th>{t('admin.role')}</th>
              <th>{t('admin.colStatus')}</th>
              <th style={{ textAlign: 'right' }}>{t('admin.colAction')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(user.id)}
                    onChange={() => toggle(user.id)}
                    aria-label={user.full_name}
                  />
                </td>
                <td>{user.full_name}</td>
                <td className="muted">{user.email}</td>
                <td>
                  <select
                    className="select"
                    style={{ width: 'auto', padding: '4px 8px' }}
                    value={user.role}
                    onChange={(e) => roleMutation.mutate({ id: user.id, role: e.target.value as Role })}
                  >
                    <option value="user">{t('admin.roleUser')}</option>
                    <option value="admin">{t('admin.roleAdmin')}</option>
                  </select>
                </td>
                <td>
                  {user.is_active ? (
                    <span className="badge-affect badge-active">{t('admin.active')}</span>
                  ) : (
                    <span className="badge-affect badge-superseded">{t('admin.passive')}</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="row-actions">
                    <button type="button" className="btn btn-sm" onClick={() => setDrawerUser(user)}>
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => askDelete(user.id, user.full_name)}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UserDrawer
        key={drawerUser?.id}
        user={drawerUser}
        onClose={() => setDrawerUser(null)}
      />
    </div>
  );
}

function LabelsTab(): JSX.Element {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const labelsQuery = useQuery({ queryKey: ['labels'], queryFn: api.listLabels });
  const labels = labelsQuery.data ?? [];
  const [name, setName] = useState('');
  const [color, setColor] = useState('#33518f');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState<string | null>(null);
  const invalidate = (): void => void queryClient.invalidateQueries({ queryKey: ['labels'] });
  const onErr = (err: unknown): void =>
    setError(err instanceof ApiError ? err.message : t('admin.labelError'));

  const createMutation = useMutation({
    mutationFn: () => api.createLabel(name.trim(), color, desc.trim() || undefined),
    onSuccess: () => {
      setName('');
      setDesc('');
      setError(null);
      invalidate();
    },
    onError: onErr,
  });

  const confirm = useConfirm();
  const [edit, setEdit] = useState<{ id: string; name: string; color: string; desc: string } | null>(null);
  const [merge, setMerge] = useState<{ id: string; into: string } | null>(null);

  const updateMutation = useMutation({
    mutationFn: () => api.updateLabel(edit!.id, edit!.name, edit!.color, edit!.desc.trim() || null),
    onSuccess: () => {
      setEdit(null);
      setError(null);
      invalidate();
    },
    onError: onErr,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteLabel(id),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: onErr,
  });
  const mergeMutation = useMutation({
    mutationFn: () => api.mergeLabel(merge!.id, merge!.into),
    onSuccess: () => {
      setMerge(null);
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t('admin.mergeError')),
  });
  const askDelete = async (id: string, label: string): Promise<void> => {
    if (await confirm({ message: t('common.deleteConfirm', { name: label }), danger: true, confirmLabel: t('common.delete') })) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = (event: FormEvent): void => {
    event.preventDefault();
    if (name.trim().length === 0) return;
    createMutation.mutate();
  };

  return (
    <div className="stack" style={{ gap: 24 }}>
      <form className="card" style={{ padding: 20 }} onSubmit={handleCreate}>
        <div className="filter-group-title" style={{ marginBottom: 14 }}>
          {t('admin.newLabel')}
        </div>
        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: 44, height: 40, padding: 2, border: '1px solid var(--line-strong)', borderRadius: 'var(--r)' }}
          />
          <input
            className="input"
            style={{ maxWidth: 220 }}
            placeholder={t('admin.labelName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            style={{ flex: 1, minWidth: 200 }}
            placeholder={t('admin.descriptionPlaceholder')}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
            {t('common.add')}
          </button>
        </div>
        <span className="hint" style={{ marginTop: 8, display: 'block' }}>{t('admin.mergeHint')}</span>
      </form>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('admin.colLabel')}</th>
              <th>{t('admin.colUsage')}</th>
              <th style={{ textAlign: 'right' }}>{t('admin.colAction')}</th>
            </tr>
          </thead>
          <tbody>
            {labels.map((label) => (
              <tr key={label.id}>
                <td>
                  {edit?.id === label.id ? (
                    <div className="stack" style={{ gap: 6 }}>
                      <div className="row" style={{ gap: 8 }}>
                        <input type="color" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })} style={{ width: 34, height: 30 }} />
                        <input className="input" style={{ padding: '4px 8px', maxWidth: 200 }} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                      </div>
                      <input className="input" style={{ padding: '4px 8px' }} placeholder={t('admin.description')} value={edit.desc} onChange={(e) => setEdit({ ...edit, desc: e.target.value })} />
                    </div>
                  ) : (
                    <>
                      <LabelChip label={label} />
                      {label.description && (
                        <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{label.description}</div>
                      )}
                    </>
                  )}
                </td>
                <td className="muted">{t('admin.usageRecords', { n: label.usage_count })}</td>
                <td style={{ textAlign: 'right' }}>
                  {merge?.id === label.id ? (
                    <div className="row-actions">
                      <span className="muted" style={{ fontSize: 12 }}>{t('admin.mergeInto')}</span>
                      <select className="select" style={{ width: 'auto', padding: '4px 8px' }} value={merge.into} onChange={(e) => setMerge({ ...merge, into: e.target.value })}>
                        <option value="">—</option>
                        {labels.filter((l) => l.id !== label.id).map((l) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-sm btn-primary" disabled={!merge.into} onClick={() => mergeMutation.mutate()}>{t('admin.mergeDo')}</button>
                      <button type="button" className="btn btn-sm" onClick={() => setMerge(null)}>{t('common.cancel')}</button>
                    </div>
                  ) : edit?.id === label.id ? (
                    <div className="row-actions">
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => updateMutation.mutate()}>{t('common.save')}</button>
                      <button type="button" className="btn btn-sm" onClick={() => setEdit(null)}>{t('common.cancel')}</button>
                    </div>
                  ) : (
                    <div className="row-actions">
                      <button type="button" className="btn btn-sm" onClick={() => setEdit({ id: label.id, name: label.name, color: label.color ?? '#33518f', desc: label.description ?? '' })}>{t('common.edit')}</button>
                      {label.usage_count > 0 && (
                        <button type="button" className="btn btn-sm" onClick={() => setMerge({ id: label.id, into: '' })}>{t('admin.merge')}</button>
                      )}
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => askDelete(label.id, label.name)}>{t('common.delete')}</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModulesTab(): JSX.Element {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const modulesQuery = useQuery({ queryKey: ['modules'], queryFn: api.listModules });
  const modules = modulesQuery.data ?? [];
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState<string | null>(null);
  const invalidate = (): void => void queryClient.invalidateQueries({ queryKey: ['modules'] });
  const onErr = (err: unknown): void =>
    setError(err instanceof ApiError ? err.message : t('admin.moduleError'));

  const createMutation = useMutation({
    mutationFn: () => api.createModule(name.trim(), desc.trim() || undefined),
    onSuccess: () => {
      setName('');
      setDesc('');
      setError(null);
      invalidate();
    },
    onError: onErr,
  });

  const confirm = useConfirm();
  const [edit, setEdit] = useState<{ id: string; name: string; desc: string } | null>(null);
  const [merge, setMerge] = useState<{ id: string; into: string } | null>(null);

  const updateMutation = useMutation({
    mutationFn: () => api.updateModule(edit!.id, edit!.name, edit!.desc.trim() || null),
    onSuccess: () => {
      setEdit(null);
      setError(null);
      invalidate();
    },
    onError: onErr,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteModule(id),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: onErr,
  });
  const mergeMutation = useMutation({
    mutationFn: () => api.mergeModule(merge!.id, merge!.into),
    onSuccess: () => {
      setMerge(null);
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t('admin.mergeError')),
  });
  const askDelete = async (id: string, label: string): Promise<void> => {
    if (await confirm({ message: t('common.deleteConfirm', { name: label }), danger: true, confirmLabel: t('common.delete') })) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = (event: FormEvent): void => {
    event.preventDefault();
    if (name.trim().length === 0) return;
    createMutation.mutate();
  };

  return (
    <div className="stack" style={{ gap: 24 }}>
      <form className="card" style={{ padding: 20 }} onSubmit={handleCreate}>
        <div className="filter-group-title" style={{ marginBottom: 14 }}>
          {t('admin.newModule')}
        </div>
        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ maxWidth: 240 }}
            placeholder={t('admin.moduleName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            style={{ flex: 1, minWidth: 200 }}
            placeholder={t('admin.descriptionPlaceholder')}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
            {t('common.add')}
          </button>
        </div>
        <span className="hint" style={{ marginTop: 8, display: 'block' }}>
          {t('admin.moduleHint')} {t('admin.mergeHint')}
        </span>
      </form>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('admin.colModule')}</th>
              <th>{t('admin.colUsage')}</th>
              <th style={{ textAlign: 'right' }}>{t('admin.colAction')}</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((module) => (
              <tr key={module.id}>
                <td>
                  {edit?.id === module.id ? (
                    <div className="stack" style={{ gap: 6 }}>
                      <input
                        className="input"
                        style={{ padding: '4px 8px', maxWidth: 220 }}
                        value={edit.name}
                        onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                      />
                      <input
                        className="input"
                        style={{ padding: '4px 8px' }}
                        placeholder={t('admin.description')}
                        value={edit.desc}
                        onChange={(e) => setEdit({ ...edit, desc: e.target.value })}
                      />
                    </div>
                  ) : (
                    <>
                      <span className="chip">{module.name}</span>
                      {module.description && (
                        <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                          {module.description}
                        </div>
                      )}
                    </>
                  )}
                </td>
                <td className="muted">{t('admin.usageRecords', { n: module.usage_count })}</td>
                <td style={{ textAlign: 'right' }}>
                  {merge?.id === module.id ? (
                    <div className="row-actions">
                      <span className="muted" style={{ fontSize: 12 }}>{t('admin.mergeInto')}</span>
                      <select
                        className="select"
                        style={{ width: 'auto', padding: '4px 8px' }}
                        value={merge.into}
                        onChange={(e) => setMerge({ ...merge, into: e.target.value })}
                      >
                        <option value="">—</option>
                        {modules.filter((m) => m.id !== module.id).map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-sm btn-primary" disabled={!merge.into} onClick={() => mergeMutation.mutate()}>
                        {t('admin.mergeDo')}
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => setMerge(null)}>{t('common.cancel')}</button>
                    </div>
                  ) : edit?.id === module.id ? (
                    <div className="row-actions">
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => updateMutation.mutate()}>{t('common.save')}</button>
                      <button type="button" className="btn btn-sm" onClick={() => setEdit(null)}>{t('common.cancel')}</button>
                    </div>
                  ) : (
                    <div className="row-actions">
                      <button type="button" className="btn btn-sm" onClick={() => setEdit({ id: module.id, name: module.name, desc: module.description ?? '' })}>{t('common.edit')}</button>
                      {module.usage_count > 0 && (
                        <button type="button" className="btn btn-sm" onClick={() => setMerge({ id: module.id, into: '' })}>{t('admin.merge')}</button>
                      )}
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => askDelete(module.id, module.name)}>{t('common.delete')}</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LinkTypesTab(): JSX.Element {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const typesQuery = useQuery({ queryKey: ['link-types'], queryFn: api.listLinkTypes });
  const types = typesQuery.data ?? [];
  const [form, setForm] = useState({
    forwardName: '',
    inverseName: '',
    color: '#33518f',
    isSupersede: false,
    description: '',
  });
  const [error, setError] = useState<string | null>(null);

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['link-types'] });
  };
  const onErr = (err: unknown): void =>
    setError(err instanceof ApiError ? err.message : t('admin.linkTypeError'));

  const createMutation = useMutation({
    mutationFn: () => api.createLinkType(form),
    onSuccess: () => {
      setForm({ forwardName: '', inverseName: '', color: '#33518f', isSupersede: false, description: '' });
      setError(null);
      invalidate();
    },
    onError: onErr,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteLinkType(id),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t('admin.deleteError')),
  });

  const confirm = useConfirm();
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    forwardName: '',
    inverseName: '',
    color: '#33518f',
    isSupersede: false,
    description: '',
  });
  const updateMutation = useMutation({
    mutationFn: (id: string) => api.updateLinkType(id, editForm),
    onSuccess: () => {
      setEditId(null);
      setError(null);
      invalidate();
    },
    onError: onErr,
  });
  const [merge, setMerge] = useState<{ id: string; into: string } | null>(null);
  const mergeMutation = useMutation({
    mutationFn: () => api.mergeLinkType(merge!.id, merge!.into),
    onSuccess: () => {
      setMerge(null);
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t('admin.mergeError')),
  });
  const askDelete = async (id: string, label: string): Promise<void> => {
    if (
      await confirm({
        message: t('common.deleteConfirm', { name: label }),
        danger: true,
        confirmLabel: t('common.delete'),
      })
    ) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = (event: FormEvent): void => {
    event.preventDefault();
    if (form.forwardName.trim().length === 0 || form.inverseName.trim().length === 0) return;
    createMutation.mutate();
  };

  return (
    <div className="stack" style={{ gap: 24 }}>
      <form className="card" style={{ padding: 20 }} onSubmit={handleCreate}>
        <div className="filter-group-title" style={{ marginBottom: 14 }}>
          {t('admin.newLinkType')}
        </div>
        {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}
        <div className="form-row-2" style={{ marginBottom: 14 }}>
          <div className="field">
            <label>{t('admin.forwardName')}</label>
            <input
              className="input"
              placeholder={t('admin.forwardPlaceholder')}
              value={form.forwardName}
              onChange={(e) => setForm({ ...form, forwardName: e.target.value })}
            />
          </div>
          <div className="field">
            <label>{t('admin.inverseName')}</label>
            <input
              className="input"
              placeholder={t('admin.inversePlaceholder')}
              value={form.inverseName}
              onChange={(e) => setForm({ ...form, inverseName: e.target.value })}
            />
          </div>
        </div>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>{t('admin.description')}</label>
          <input
            className="input"
            placeholder={t('admin.descriptionPlaceholder')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
          <label className="filter-check">
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              style={{ width: 40, height: 34 }}
            />
            {t('admin.color')}
          </label>
          <label className="filter-check">
            <input
              type="checkbox"
              checked={form.isSupersede}
              onChange={(e) => setForm({ ...form, isSupersede: e.target.checked })}
            />
            {t('admin.supersedeCheck')}
          </label>
          <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
            {t('common.add')}
          </button>
        </div>
        <span className="hint" style={{ marginTop: 8, display: 'block' }}>{t('admin.mergeHint')}</span>
      </form>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('admin.colDirection')}</th>
              <th>{t('admin.colSupersede')}</th>
              <th>{t('admin.colColor')}</th>
              <th style={{ textAlign: 'right' }}>{t('admin.colAction')}</th>
            </tr>
          </thead>
          <tbody>
            {types.map((type) => {
              const editing = editId === type.id;
              return (
                <tr key={type.id}>
                  <td>
                    {editing ? (
                      <div className="stack" style={{ gap: 6 }}>
                        <div className="row" style={{ gap: 6 }}>
                          <input
                            className="input"
                            style={{ padding: '4px 8px', maxWidth: 110 }}
                            value={editForm.forwardName}
                            onChange={(e) => setEditForm({ ...editForm, forwardName: e.target.value })}
                          />
                          <span className="muted">→</span>
                          <input
                            className="input"
                            style={{ padding: '4px 8px', maxWidth: 110 }}
                            value={editForm.inverseName}
                            onChange={(e) => setEditForm({ ...editForm, inverseName: e.target.value })}
                          />
                        </div>
                        <input
                          className="input"
                          style={{ padding: '4px 8px' }}
                          placeholder={t('admin.description')}
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        />
                      </div>
                    ) : (
                      <>
                        <strong>{type.forward_name}</strong>{' '}
                        <span className="muted">→ {type.inverse_name}</span>
                        {type.description && (
                          <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{type.description}</div>
                        )}
                      </>
                    )}
                  </td>
                  <td>
                    {editing ? (
                      <input
                        type="checkbox"
                        checked={editForm.isSupersede}
                        onChange={(e) => setEditForm({ ...editForm, isSupersede: e.target.checked })}
                      />
                    ) : type.is_supersede ? (
                      <span className="badge-affect badge-superseded">{t('admin.badgeSupersede')}</span>
                    ) : (
                      <span className="muted">{t('common.none')}</span>
                    )}
                  </td>
                  <td>
                    {editing ? (
                      <input
                        type="color"
                        value={editForm.color}
                        onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                        style={{ width: 34, height: 30 }}
                      />
                    ) : (
                      <span
                        style={{
                          display: 'inline-block',
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          background: type.color ?? 'var(--line-strong)',
                          border: '1px solid var(--line-strong)',
                        }}
                      />
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {merge?.id === type.id ? (
                      <div className="row-actions">
                        <span className="muted" style={{ fontSize: 12 }}>{t('admin.mergeInto')}</span>
                        <select className="select" style={{ width: 'auto', padding: '4px 8px' }} value={merge.into} onChange={(e) => setMerge({ ...merge, into: e.target.value })}>
                          <option value="">—</option>
                          {types.filter((x) => x.id !== type.id).map((x) => (
                            <option key={x.id} value={x.id}>{x.forward_name}</option>
                          ))}
                        </select>
                        <button type="button" className="btn btn-sm btn-primary" disabled={!merge.into} onClick={() => mergeMutation.mutate()}>{t('admin.mergeDo')}</button>
                        <button type="button" className="btn btn-sm" onClick={() => setMerge(null)}>{t('common.cancel')}</button>
                      </div>
                    ) : editing ? (
                      <div className="row-actions">
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => updateMutation.mutate(type.id)}>{t('common.save')}</button>
                        <button type="button" className="btn btn-sm" onClick={() => setEditId(null)}>{t('common.cancel')}</button>
                      </div>
                    ) : (
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            setEditId(type.id);
                            setEditForm({
                              forwardName: type.forward_name,
                              inverseName: type.inverse_name,
                              color: type.color ?? '#33518f',
                              isSupersede: type.is_supersede,
                              description: type.description ?? '',
                            });
                          }}
                        >
                          {t('common.edit')}
                        </button>
                        <button type="button" className="btn btn-sm" onClick={() => setMerge({ id: type.id, into: '' })}>{t('admin.merge')}</button>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => askDelete(type.id, type.forward_name)}>{t('common.delete')}</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmailTemplatesTab(): JSX.Element {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const templatesQuery = useQuery({ queryKey: ['email-templates'], queryFn: api.listEmailTemplates });
  const [drafts, setDrafts] = useState<Record<string, { subject: string; body: string }>>({});
  const [msg, setMsg] = useState<{ key: string; ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (templatesQuery.data) {
      setDrafts(
        Object.fromEntries(
          templatesQuery.data.map((tpl) => [tpl.key, { subject: tpl.subject, body: tpl.body_html }]),
        ),
      );
    }
  }, [templatesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (input: { key: string; subject: string; body: string }) =>
      api.updateEmailTemplate(input.key, input.subject, input.body),
    onSuccess: (_r, v) => {
      setMsg({ key: v.key, ok: true, text: t('admin.tplSaved') });
      void queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
    onError: (err, v) =>
      setMsg({ key: v.key, ok: false, text: err instanceof ApiError ? err.message : t('admin.tplError') }),
  });

  return (
    <div className="stack" style={{ gap: 20 }}>
      {(templatesQuery.data ?? []).map((tpl) => {
        const draft = drafts[tpl.key] ?? { subject: tpl.subject, body: tpl.body_html };
        return (
          <form
            className="card"
            style={{ padding: 20 }}
            key={tpl.key}
            onSubmit={(e) => {
              e.preventDefault();
              setMsg(null);
              saveMutation.mutate({ key: tpl.key, subject: draft.subject, body: draft.body });
            }}
          >
            <div className="filter-group-title" style={{ marginBottom: 12 }}>
              {t(`admin.tplName.${tpl.key}`)}
            </div>
            {msg?.key === tpl.key && (
              <div className={msg.ok ? 'form-ok' : 'form-error'} style={{ marginBottom: 12 }}>
                {msg.text}
              </div>
            )}
            <div className="field" style={{ marginBottom: 14 }}>
              <label>{t('admin.tplSubject')}</label>
              <input
                className="input"
                value={draft.subject}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [tpl.key]: { ...draft, subject: e.target.value } }))
                }
              />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>{t('admin.tplBody')}</label>
              <textarea
                className="textarea"
                style={{ minHeight: 150, fontFamily: 'var(--font-mono)', fontSize: 12 }}
                value={draft.body}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [tpl.key]: { ...draft, body: e.target.value } }))
                }
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <span className="filter-group-title">{t('admin.tplVariables')}: </span>
              {tpl.variables.map((v) => (
                <span
                  key={v}
                  className="chip"
                  style={{ marginRight: 6, fontFamily: 'var(--font-mono)' }}
                >{`{{${v}}}`}</span>
              ))}
            </div>
            <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span className="hint">{t('admin.tplHint')}</span>
              <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                {t('common.save')}
              </button>
            </div>
          </form>
        );
      })}
    </div>
  );
}
