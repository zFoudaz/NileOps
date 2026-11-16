import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  className,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div
        className={cn(
          'relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl text-right animate-in zoom-in-95',
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute left-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-5 w-5 text-slate-500" />
          <span className="sr-only">إغلاق</span>
        </button>

        {title && <h2 className="text-lg font-bold text-slate-900 mb-1">{title}</h2>}
        {description && <p className="text-sm text-slate-500 mb-4">{description}</p>}

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};
