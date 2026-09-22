import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/queries';
import { ApiError } from '../lib/api';
import type { PublicUser, Role } from '../lib/types';
import { useI18n } from '../i18n/I18nContext';

/**
 * Admin kullanıcı düzenleme çekmecesi (drawer). İsim, e-posta, rol, durum ve
 * doğrudan parola belirleme — mail sunucusu olmayan kurulumlar için elle.
 */
export function UserDrawer({
  user,
  onClose,
}: {
  user: PublicUser | null;
  onClose: () => void;
}): JSX.Element | null {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<Role>(user?.role ?? 'user');
  const [isActive, setIsActive] = useState<boolean>(user?.is_active ?? true);
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  if (!user) return null;

  const invalidate = (): void => void queryClient.invalidateQueries({ queryKey: ['users'] });

  const save = async (): Promise<void> => {
    setMsg(null);
    setSaving(true);
    try {
      if (fullName.trim() !== user.full_name || email.trim() !== user.email) {
        await api.updateUser(user.id, fullName.trim(), email.trim());
      }
      if (role !== user.role) await api.setUserRole(user.id, role);
      if (isActive !== user.is_active) await api.setUserActive(user.id, isActive);
      invalidate();
      setMsg({ ok: true, text: t('admin.saved') });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : t('admin.actionError') });
    } finally {
      setSaving(false);
    }
  };

  const setPassword = async (): Promise<void> => {
    setMsg(null);
    setPwSaving(true);
    try {
      await api.setUserPassword(user.id, newPassword);
      setNewPassword('');
      setMsg({ ok: true, text: t('admin.passwordSet') });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : t('admin.actionError') });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <>
      <div className="side-overlay" onClick={onClose} />
      <aside className="side-panel">
        <div className="side-panel-head">
          <strong>{t('admin.editUser')}</strong>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>

        <div className="side-panel-body">
          {msg && (
            <div className={msg.ok ? 'form-ok' : 'form-error'} style={{ marginBottom: 14 }}>
              {msg.text}
            </div>
          )}

          <div className="field" style={{ marginBottom: 14 }}>
            <label>{t('admin.fullName')}</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>{t('admin.email')}</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>{t('admin.role')}</label>
            <select className="select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="user">{t('admin.roleUser')}</option>
              <option value="admin">{t('admin.roleAdmin')}</option>
            </select>
          </div>
          <label className="filter-check" style={{ marginBottom: 16 }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            {t('admin.active')}
          </label>

          <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => void save()} disabled={saving}>
            {saving ? t('profile.saving') : t('common.save')}
          </button>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <div className="filter-group-title" style={{ marginBottom: 10 }}>
              {t('admin.setPassword')}
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>{t('admin.newPassword')}</label>
              <input
                className="input"
                type="text"
                placeholder="min 6 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn"
              style={{ width: '100%' }}
              onClick={() => void setPassword()}
              disabled={pwSaving || newPassword.length < 6}
            >
              {pwSaving ? t('profile.saving') : t('admin.setPassword')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
