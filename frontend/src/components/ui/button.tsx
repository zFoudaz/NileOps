import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'gold' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-[10px] font-semibold transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer select-none border-[1.5px]';

    const variants = {
      default: 'bg-[var(--teal)] border-[var(--teal)] text-white hover:bg-[var(--teal2)] hover:border-[var(--teal2)]',
      gold: 'bg-[var(--gold)] border-[var(--gold)] text-[#1d1604] hover:brightness-95',
      secondary: 'bg-[#ece4d0] border-[#ddd3bf] text-[var(--ink)] hover:bg-[#e3d9c1]',
      outline: 'bg-transparent border-[var(--teal)] text-[var(--teal)] hover:bg-[var(--in-bg)]',
      destructive: 'bg-[var(--bad)] border-[var(--bad)] text-white hover:brightness-90',
      success: 'bg-[var(--ok)] border-[var(--ok)] text-white hover:brightness-95',
      ghost: 'bg-transparent border-transparent text-[var(--ink)] hover:bg-[var(--hover-row)]',
    };

    const sizes = {
      sm: 'min-h-[36px] px-3.5 text-[14px] gap-1.5',
      md: 'min-h-[44px] px-5 text-[15px] gap-2',
      lg: 'min-h-[48px] px-6 text-[16px] gap-2.5',
      icon: 'h-10 w-10 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
