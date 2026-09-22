import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';

interface TokenInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** Yazılan metne göre öneri listesini döndürür. */
  fetchSuggestions: (query: string) => Promise<string[]>;
  /** Öneride olmayan yeni bir değerin eklenmesine izin ver. */
  allowCreate?: boolean;
}

/**
 * Etiket/kişi gibi çoklu değerleri, yazarken öneriyle (autocomplete) toplayan
 * giriş bileşeni. Enter ile ekler, Backspace ile son değeri siler.
 */
export function TokenInput({
  values,
  onChange,
  placeholder,
  fetchSuggestions,
  allowCreate = true,
}: TokenInputProps): JSX.Element {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const handle = setTimeout(() => {
      fetchSuggestions(text)
        .then((list) => {
          if (!active) return;
          const filtered = list.filter(
            (item) => !values.some((v) => v.toLocaleLowerCase('tr') === item.toLocaleLowerCase('tr')),
          );
          setSuggestions(filtered);
        })
        .catch(() => {
          if (active) setSuggestions([]);
        });
    }, 180);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [text, values, fetchSuggestions]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent): void => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const add = (value: string): void => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    const exists = values.some((v) => v.toLocaleLowerCase('tr') === trimmed.toLocaleLowerCase('tr'));
    if (!exists) onChange([...values, trimmed]);
    setText('');
    setActiveIndex(-1);
  };

  const removeAt = (index: number): void => {
    onChange(values.filter((_, i) => i !== index));
  };

  const showCreate =
    allowCreate &&
    text.trim().length > 0 &&
    !suggestions.some((s) => s.toLocaleLowerCase('tr') === text.trim().toLocaleLowerCase('tr'));
  const options = showCreate ? [...suggestions, `__create__${text.trim()}`] : suggestions;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const picked = options[activeIndex];
      if (picked) add(picked.replace(/^__create__/, ''));
      else if (allowCreate) add(text);
    } else if (event.key === 'Backspace' && text.length === 0 && values.length > 0) {
      removeAt(values.length - 1);
    }
  };

  return (
    <div className="token-input" ref={boxRef}>
      <div className="token-box" onClick={() => setOpen(true)}>
        {values.map((value, index) => (
          <span className="token" key={`${value}-${index}`}>
            {value}
            <button type="button" onClick={() => removeAt(index)} aria-label={t('common.remove')}>
              ×
            </button>
          </span>
        ))}
        <input
          value={text}
          placeholder={values.length === 0 ? placeholder : ''}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {open && options.length > 0 && (
        <div className="suggestions">
          {options.map((option, index) => {
            const isCreate = option.startsWith('__create__');
            const label = isCreate ? option.replace('__create__', '') : option;
            return (
              <div
                key={option}
                className={`suggestion${index === activeIndex ? ' active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  add(label);
                }}
              >
                {label}
                {isCreate && <span className="new-hint">{t('token.newHint')}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
