import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { TopbarControls } from './TopbarControls';
import { Logo } from './Logo';

/** Uygulama kabuğu: üst bar (marka + gezinme + kontroller + kullanıcı) ve içerik. */
export function Layout(): JSX.Element {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <Logo size={26} />
          <span className="wordmark topbar-brand">Decreta</span>
          <span className="topbar-tagline">{t('nav.tagline')}</span>
        </div>

        <nav className="topbar-nav">
          <NavLink to="/" end className="nav-link">
            {t('nav.records')}
          </NavLink>
          <NavLink to="/records/new" className="nav-link">
            {t('nav.newRecord')}
          </NavLink>
          <NavLink to="/activity" className="nav-link">
            {t('nav.activity')}
          </NavLink>
          <NavLink to="/reports" className="nav-link">
            {t('nav.reports')}
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className="nav-link">
              {t('nav.admin')}
            </NavLink>
          )}
        </nav>

        <div className="topbar-right">
          <TopbarControls />
          <NavLink to="/profile" className="topbar-user" title={t('nav.profile')}>
            <span className="topbar-user-name">{user?.fullName}</span>
            <span className="topbar-user-role muted">
              {user?.role === 'admin' ? t('nav.roleAdmin') : t('nav.roleUser')}
            </span>
          </NavLink>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            {t('nav.logout')}
          </button>
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
