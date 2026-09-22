import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export const THEMES = ['light', 'sepia', 'dark', 'midnight'] as const;
export type Theme = (typeof THEMES)[number];

/** Tema listesi + açık/koyu sınıflandırması (seçicide gruplamak için). */
export const THEME_META: { key: Theme; kind: 'light' | 'dark' }[] = [
  { key: 'light', kind: 'light' },
  { key: 'sepia', kind: 'light' },
  { key: 'dark', kind: 'dark' },
  { key: 'midnight', kind: 'dark' },
];

const STORAGE_KEY = 'decreta.theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (THEMES as readonly string[]).includes(stored)) return stored as Theme;
  } catch {
    /* yoksay */
  }
  return 'light';
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setThemeState] = useState<Theme>(() => {
    const initial = readInitialTheme();
    applyTheme(initial);
    return initial;
  });

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* yoksay */
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme yalnızca ThemeProvider içinde kullanılabilir');
  return ctx;
}
