import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { ToastContext, type ToastItem } from './toastContext';

export { type ToastVariant, type ToastItem, type ToastContextType } from './toastContext';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = 'default', duration = 4000 }: Omit<ToastItem, 'id'>) => {
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

  const icons = {
    default: <Info className="h-5 w-5 text-blue-600 shrink-0" />,
    success: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />,
    destructive: <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />,
  };

  const borders = {
    default: 'border-blue-200 bg-white text-slate-900',
    success: 'border-emerald-200 bg-white text-slate-900',
    destructive: 'border-rose-200 bg-white text-slate-900',
    warning: 'border-amber-200 bg-white text-slate-900',
  };

  return (
    <div
      dir="rtl"
      className="fixed bottom-4 left-4 z-50 flex max-h-screen w-full max-w-sm flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-lg transition-all animate-in slide-in-from-bottom-5',
            borders[t.variant || 'default']
          )}
        >
          {icons[t.variant || 'default']}
          <div className="flex-1 text-right">
            {t.title && <div className="text-sm font-bold text-slate-900 mb-0.5">{t.title}</div>}
            {t.description && <div className="text-xs text-slate-600">{t.description}</div>}
          </div>
          <button
            onClick={() => onDismiss(t.id)}
            className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
