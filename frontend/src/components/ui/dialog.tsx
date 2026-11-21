import React from 'react';
import { cn } from '@/lib/utils';

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a2827]/55"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full max-w-[440px] rounded-[14px] border border-[var(--line)] bg-[var(--card)] p-5 text-right shadow-xl',
          className
        )}
      >
        {title && <h2 className="text-xl font-bold text-[var(--ink)] mb-2">{title}</h2>}
        {description && <p className="text-sm text-[var(--mut)] mb-4 leading-relaxed">{description}</p>}

        <div>{children}</div>
      </div>
    </div>
  );
};
