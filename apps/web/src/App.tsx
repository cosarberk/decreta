import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { useI18n } from './i18n/I18nContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ResetPage } from './pages/ResetPage';
import { RecordsPage } from './pages/RecordsPage';
import { RecordDetailPage } from './pages/RecordDetailPage';
import { NewRecordPage } from './pages/NewRecordPage';
import { ProfilePage } from './pages/ProfilePage';
import { ActivityPage } from './pages/ActivityPage';
import { ReportsPage } from './pages/ReportsPage';
import { AdminPage } from './pages/AdminPage';

export function App(): JSX.Element {
  const { isLoading } = useAuth();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
        <span className="muted">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset" element={<ResetPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RecordsPage />} />
        <Route path="records/new" element={<NewRecordPage />} />
        <Route path="records/:id" element={<RecordDetailPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
