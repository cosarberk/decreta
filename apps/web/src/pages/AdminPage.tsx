import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/queries';
import { ApiError } from '../lib/api';
import type { Role } from '../lib/types';
import { LabelChip } from '../components/atoms';
import { useI18n } from '../i18n/I18nContext';
import { formatDate } from '../lib/format';

type Tab = 'users' | 'labels' | 'modules' | 'linkTypes';

const TABS: { key: Tab; labelKey: string }[] = [
  { key: 'users', labelKey: 'admin.tabUsers' },
  { key: 'modules', labelKey: 'admin.tabModules' },
  { key: 'labels', labelKey: 'admin.tabLabels' },
  { key: 'linkTypes', labelKey: 'admin.tabLinkTypes' },
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

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('admin.fullName')}</th>
              <th>{t('admin.email')}</th>
              <th>{t('admin.role')}</th>
              <th>{t('admin.colStatus')}</th>
              <th style={{ textAlign: 'right' }}>{t('admin.colAction')}</th>
            </tr>
          </thead>
          <tbody>
            {(usersQuery.data ?? []).map((user) => (
              <tr key={user.id}>
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
                  <button
                    type="button"
                    className={`btn btn-sm${user.is_active ? ' btn-danger' : ''}`}
                    onClick={() => activeMutation.mutate({ id: user.id, isActive: !user.is_active })}
                  >
                    {user.is_active ? t('admin.deactivate') : t('admin.activate')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LabelsTab(): JSX.Element {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const labelsQuery = useQuery({ queryKey: ['labels'], queryFn: api.listLabels });
  const [name, setName] = useState('');
  const [color, setColor] = useState('#33518f');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => api.createLabel(name.trim(), color),
    onSuccess: () => {
      setName('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['labels'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t('admin.labelError')),
  });

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
            className="input"
            style={{ maxWidth: 260 }}
            placeholder={t('admin.labelName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: 44, height: 40, padding: 2, border: '1px solid var(--line-strong)', borderRadius: 'var(--r)' }}
          />
          <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
            {t('common.add')}
          </button>
        </div>
      </form>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('admin.colLabel')}</th>
              <th>{t('admin.colUsage')}</th>
              <th>{t('admin.colCreated')}</th>
            </tr>
          </thead>
          <tbody>
            {(labelsQuery.data ?? []).map((label) => (
              <tr key={label.id}>
                <td>
                  <LabelChip label={label} />
                </td>
                <td className="muted">{t('admin.usageRecords', { n: label.usage_count })}</td>
                <td className="muted">{formatDate(label.created_at)}</td>
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
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => api.createModule(name.trim()),
    onSuccess: () => {
      setName('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t('admin.moduleError')),
  });

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
            style={{ maxWidth: 300 }}
            placeholder={t('admin.moduleName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
            {t('common.add')}
          </button>
        </div>
        <span className="hint" style={{ marginTop: 8, display: 'block' }}>
          {t('admin.moduleHint')}
        </span>
      </form>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('admin.colModule')}</th>
              <th>{t('admin.colUsage')}</th>
              <th>{t('admin.colCreated')}</th>
            </tr>
          </thead>
          <tbody>
            {(modulesQuery.data ?? []).map((module) => (
              <tr key={module.id}>
                <td>
                  <span className="chip">{module.name}</span>
                </td>
                <td className="muted">{t('admin.usageRecords', { n: module.usage_count })}</td>
                <td className="muted">{formatDate(module.created_at)}</td>
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
  const [form, setForm] = useState({
    forwardName: '',
    inverseName: '',
    color: '#33518f',
    isSupersede: false,
  });
  const [error, setError] = useState<string | null>(null);

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['link-types'] });
  };

  const createMutation = useMutation({
    mutationFn: () => api.createLinkType(form),
    onSuccess: () => {
      setForm({ forwardName: '', inverseName: '', color: '#33518f', isSupersede: false });
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t('admin.linkTypeError')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteLinkType(id),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : t('admin.deleteError')),
  });

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
      </form>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
            {(typesQuery.data ?? []).map((type) => (
              <tr key={type.id}>
                <td>
                  <strong>{type.forward_name}</strong> <span className="muted">→ {type.inverse_name}</span>
                </td>
                <td>
                  {type.is_supersede ? (
                    <span className="badge-affect badge-superseded">{t('admin.badgeSupersede')}</span>
                  ) : (
                    <span className="muted">{t('common.none')}</span>
                  )}
                </td>
                <td>
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
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteMutation.mutate(type.id)}
                  >
                    {t('admin.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
