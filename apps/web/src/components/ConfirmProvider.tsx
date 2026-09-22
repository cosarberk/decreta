import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n/I18nContext';

interface ConfirmOptions {
  message: string;
  title?: string;
  confirmLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Söz (promise) tabanlı onay diyaloğu sağlar: `await confirm({...})`. */
export function ConfirmProvider({ children }: { children: ReactNode }): JSX.Element {
  const { t } = useI18n();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean): void => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <>
          <div className="side-overlay" onClick={() => close(false)} />
          <div className="modal" role="dialog" aria-modal="true">
            {opts.title && <div className="modal-title">{opts.title}</div>}
            <p className="modal-message">{opts.message}</p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => close(false)}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className={`btn ${opts.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => close(true)}
                autoFocus
              >
                {opts.confirmLabel ?? t('common.confirm')}
              </button>
            </div>
          </div>
        </>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm yalnızca ConfirmProvider içinde kullanılabilir');
  return ctx;
}
