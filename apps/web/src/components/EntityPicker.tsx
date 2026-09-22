import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';

export interface PickerItem {
  id: string;
  label: string;
  hint?: string;
}

interface EntityPickerProps {
  value: PickerItem | null;
  onChange: (value: PickerItem | null) => void;
  fetchItems: (query: string) => Promise<PickerItem[]>;
  placeholder?: string;
}

/**
 * Kimlikli tekil seçim (autocomplete). Bir öğe seçilince çip olarak gösterilir;
 * temizle butonuyla seçim kaldırılır. Kişi filtresi ve kayıt seçici için ortak.
 */
export function EntityPicker({
  value,
  onChange,
  fetchItems,
  placeholder,
}: EntityPickerProps): JSX.Element {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [items, setItems] = useState<PickerItem[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) return;
    let active = true;
    const handle = setTimeout(() => {
      fetchItems(text)
        .then((list) => active && setItems(list))
        .catch(() => active && setItems([]));
    }, 180);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [text, value, fetchItems]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent): void => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const select = (item: PickerItem): void => {
    onChange(item);
    setText('');
    setOpen(false);
    setActiveIndex(-1);
  };

  if (value) {
    return (
      <div className="token-box" style={{ minHeight: 'auto' }}>
        <span className="token">
          {value.label}
          <button type="button" onClick={() => onChange(null)} aria-label={t('common.remove')}>
            ×
          </button>
        </span>
      </div>
    );
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const picked = items[activeIndex];
      if (picked) select(picked);
    }
  };

  return (
    <div className="token-input" ref={boxRef}>
      <div className="token-box" style={{ minHeight: 'auto' }}>
        <input
          value={text}
          placeholder={placeholder}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {open && items.length > 0 && (
        <div className="suggestions">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`suggestion${index === activeIndex ? ' active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                select(item);
              }}
            >
              {item.label}
              {item.hint && <span className="new-hint">{item.hint}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
