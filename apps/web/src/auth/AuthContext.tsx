import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiRequest, tokenStore } from '../lib/api';
import type { AuthUserInfo } from '../lib/types';

interface AuthContextValue {
  user: AuthUserInfo | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Oturum durumunu yönetir. Açılışta mevcut token varsa `/auth/me` ile
 * kullanıcıyı doğrular; geçersizse sessizce oturumu kapatır.
 */
export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<AuthUserInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const token = tokenStore.get();
    if (!token) {
      setIsLoading(false);
      return;
    }
    apiRequest<AuthUserInfo & { full_name?: string }>('/auth/me')
      .then((me) => {
        if (!active) return;
        setUser(normalizeUser(me));
      })
      .catch(() => {
        if (!active) return;
        tokenStore.clear();
        setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<{ token: string; user: AuthUserInfo }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    tokenStore.set(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** `/auth/me` (snake_case) ile login yanıtını (camelCase) tek biçime getirir. */
function normalizeUser(raw: AuthUserInfo & { full_name?: string }): AuthUserInfo {
  return {
    id: raw.id,
    email: raw.email,
    fullName: raw.fullName ?? raw.full_name ?? '',
    role: raw.role,
  };
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth yalnızca AuthProvider içinde kullanılabilir');
  return ctx;
}
