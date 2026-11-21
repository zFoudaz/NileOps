import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex min-h-[44px] w-full rounded-[10px] border-[1.5px] border-[var(--input-border)] bg-white px-3 py-2 text-[15px] text-[var(--ink)] placeholder:text-[var(--mut)]/70 disabled:cursor-not-allowed disabled:bg-[var(--locked-bg)] disabled:border-[var(--locked-border)] disabled:text-[var(--ink)]/80 text-right transition-colors',
          error && 'border-[var(--bad)]',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
