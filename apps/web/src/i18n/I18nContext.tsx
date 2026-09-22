import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { LANGUAGES, translations, type Language } from './translations';
import { setFormatLocale } from '../lib/format';

const STORAGE_KEY = 'decreta.lang';

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readInitialLang(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (LANGUAGES as readonly string[]).includes(stored)) return stored as Language;
  } catch {
    /* yoksay */
  }
  return 'tr';
}

/** Verilen dilde "a.b.c" anahtarını çözer; bulunamazsa anahtarı döndürür. */
function resolve(lang: Language, key: string): string {
  const parts = key.split('.');
  let node: unknown = translations[lang];
  for (const part of parts) {
    if (node && typeof node === 'object' && part in node) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof node === 'string' ? node : key;
}

export function I18nProvider({ children }: { children: ReactNode }): JSX.Element {
  const [lang, setLangState] = useState<Language>(() => {
    const initial = readInitialLang();
    setFormatLocale(initial);
    document.documentElement.lang = initial;
    return initial;
  });

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    setFormatLocale(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* yoksay */
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text = resolve(lang, key);
      if (params) {
        for (const [name, value] of Object.entries(params)) {
          text = text.replace(`{${name}}`, String(value));
        }
      }
      return text;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n yalnızca I18nProvider içinde kullanılabilir');
  return ctx;
}
