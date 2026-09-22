import { useI18n } from '../i18n/I18nContext';
import { LANGUAGES } from '../i18n/translations';
import { useTheme } from '../theme/ThemeContext';
import { THEME_META, type Theme } from '../theme/ThemeContext';

/** Üst bardaki dil ve tema seçicileri. */
export function TopbarControls(): JSX.Element {
  const { lang, setLang, t } = useI18n();
  const { theme, setTheme } = useTheme();

  return (
    <div className="topbar-controls">
      <select
        className="topbar-select"
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        title={t('common.theme')}
        aria-label={t('common.theme')}
      >
        {THEME_META.map((meta) => (
          <option key={meta.key} value={meta.key}>
            {t(`themes.${meta.key}`)}
          </option>
        ))}
      </select>

      <select
        className="topbar-select"
        value={lang}
        onChange={(e) => setLang(e.target.value as (typeof LANGUAGES)[number])}
        title={t('common.language')}
        aria-label={t('common.language')}
      >
        {LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {code.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}
