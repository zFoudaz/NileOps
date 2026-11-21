import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { ToastContext, type ToastItem } from './toastContext';

export { type ToastVariant, type ToastItem, type ToastContextType } from './toastContext';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = 'default', duration = 3500 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, description, variant, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const ToastViewport: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  const variantClasses = {
    default: 'bg-[var(--teal2)] text-white border-[var(--teal)]',
    success: 'bg-[var(--teal2)] text-white border-[var(--ok)]',
    destructive: 'bg-[var(--bad)] text-white border-[#7f1d1d]',
    warning: 'bg-[var(--warn-ink)] text-white border-[var(--gold)]',
  };

  return (
    <div
      dir="rtl"
      role="status"
      className="fixed bottom-5 start-5 z-[60] flex max-h-screen w-[calc(100%-40px)] max-w-sm flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex w-full items-start justify-between gap-3 rounded-[12px] border px-4 py-3 shadow-lg',
            variantClasses[t.variant || 'default']
          )}
        >
          <div className="flex-1 text-right">
            {t.title && <div className="text-[14px] font-semibold">{t.title}</div>}
            {t.description && <div className="text-[13px] opacity-90 mt-0.5 leading-snug">{t.description}</div>}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="opacity-75 hover:opacity-100 p-0.5 rounded cursor-pointer shrink-0"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
