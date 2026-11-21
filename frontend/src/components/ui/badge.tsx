import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', ...props }) => {
  const variants = {
    default: 'text-[var(--teal)] bg-[var(--in-bg)] border-current',
    info: 'text-[var(--teal)] bg-[var(--in-bg)] border-current',
    success: 'text-[var(--ok)] bg-[var(--ok-bg)] border-current',
    warning: 'text-[var(--warn)] bg-[var(--warn-bg)] border-current',
    destructive: 'text-[var(--bad)] bg-[var(--bad-bg)] border-current',
    secondary: 'text-[var(--mut)] bg-[#ece4d0] border-[#b8b09a]',
    outline: 'text-[var(--ink)] bg-transparent border-[var(--line)]',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-[3px] text-[13px] font-semibold whitespace-nowrap select-none leading-tight',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};
