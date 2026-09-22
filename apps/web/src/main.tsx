import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { I18nProvider } from './i18n/I18nContext';
import { ThemeProvider } from './theme/ThemeContext';
import { ConfirmProvider } from './components/ConfirmProvider';
import { App } from './App';
import './index.css';
import './app.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <ConfirmProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <AuthProvider>
                <App />
              </AuthProvider>
            </BrowserRouter>
          </QueryClientProvider>
        </ConfirmProvider>
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
