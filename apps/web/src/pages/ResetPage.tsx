import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { api } from '../lib/queries';
import { ApiError } from '../lib/api';
import { Logo } from '../components/Logo';

export function ResetPage(): JSX.Element {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirm) {
      setError(t('reset.mismatch'));
      return;
    }
    setSubmitting(true);
    try {
      await api.resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('reset.invalid'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <div className="login-brand">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Logo size={52} />
          </div>
          <div className="wordmark">Decreta</div>
          <div className="sub">{t('reset.title')}</div>
        </div>

        {!token ? (
          <div className="form-error">{t('reset.noToken')}</div>
        ) : done ? (
          <div className="stack" style={{ gap: 16, alignItems: 'center' }}>
            <div className="form-ok" style={{ width: '100%' }}>{t('reset.success')}</div>
            <Link to="/login" className="btn btn-primary">
              {t('reset.toLogin')}
            </Link>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="form-error">{error}</div>}
            <div className="field">
              <label htmlFor="np">{t('reset.newPassword')}</label>
              <input
                id="np"
                className="input"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="cf">{t('reset.confirm')}</label>
              <input
                id="cf"
                className="input"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? t('reset.submitting') : t('reset.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
