import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { api } from '../lib/queries';
import { ApiError } from '../lib/api';

export function ProfilePage(): JSX.Element {
  const { user, updateUser } = useAuth();
  const { t } = useI18n();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const profileMutation = useMutation({
    mutationFn: () => api.updateProfile(fullName),
    onSuccess: (updated) => {
      updateUser({ fullName: updated.full_name });
      setProfileMsg({ ok: true, text: t('profile.saved') });
    },
    onError: (err) =>
      setProfileMsg({ ok: false, text: err instanceof ApiError ? err.message : t('profile.saveError') }),
  });

  const passwordMutation = useMutation({
    mutationFn: () => api.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ ok: true, text: t('profile.changed') });
    },
    onError: (err) =>
      setPasswordMsg({ ok: false, text: err instanceof ApiError ? err.message : t('profile.passwordError') }),
  });

  const submitProfile = (event: FormEvent): void => {
    event.preventDefault();
    setProfileMsg(null);
    if (fullName.trim().length === 0) return;
    profileMutation.mutate();
  };

  const submitPassword = (event: FormEvent): void => {
    event.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: t('profile.mismatch') });
      return;
    }
    passwordMutation.mutate();
  };

  const nameChanged = fullName.trim() !== (user?.fullName ?? '').trim();

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('profile.title')}</h1>
          <p className="page-subtitle">{t('profile.subtitle')}</p>
        </div>
      </div>

      <div className="profile-wrap">
        {/* Hesap */}
        <form className="card form-card" onSubmit={submitProfile}>
          <div className="filter-group-title" style={{ marginBottom: 16 }}>
            {t('profile.account')}
          </div>
          <div className="form-grid">
            {profileMsg && (
              <div className={profileMsg.ok ? 'form-ok' : 'form-error'}>{profileMsg.text}</div>
            )}
            <div className="field">
              <label>{t('profile.email')}</label>
              <input className="input" value={user?.email ?? ''} disabled />
              <span className="hint">{t('profile.emailHint')}</span>
            </div>
            <div className="field">
              <label htmlFor="fullName">{t('profile.fullName')}</label>
              <input
                id="fullName"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t('profile.role')}</label>
              <input
                className="input"
                value={user?.role === 'admin' ? t('nav.roleAdmin') : t('nav.roleUser')}
                disabled
              />
            </div>
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!nameChanged || profileMutation.isPending}
              >
                {profileMutation.isPending ? t('profile.saving') : t('profile.save')}
              </button>
            </div>
          </div>
        </form>

        {/* Parola */}
        <form className="card form-card" onSubmit={submitPassword}>
          <div className="filter-group-title" style={{ marginBottom: 16 }}>
            {t('profile.passwordTitle')}
          </div>
          <div className="form-grid">
            {passwordMsg && (
              <div className={passwordMsg.ok ? 'form-ok' : 'form-error'}>{passwordMsg.text}</div>
            )}
            <div className="field">
              <label htmlFor="cur">{t('profile.currentPassword')}</label>
              <input
                id="cur"
                className="input"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="form-row-2">
              <div className="field">
                <label htmlFor="new">{t('profile.newPassword')}</label>
                <input
                  id="new"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="conf">{t('profile.confirmPassword')}</label>
                <input
                  id="conf"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  !currentPassword || !newPassword || !confirmPassword || passwordMutation.isPending
                }
              >
                {passwordMutation.isPending ? t('profile.changing') : t('profile.changeBtn')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
