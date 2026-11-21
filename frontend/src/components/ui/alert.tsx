import React from 'react';
import { cn } from '@/lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-[var(--in-bg)] border-[var(--teal)] text-[var(--teal)]',
      destructive: 'bg-[var(--bad-bg)] border-[var(--bad)] text-[var(--bad)]',
      success: 'bg-[var(--ok-bg)] border-[var(--ok)] text-[var(--ok)]',
      warning: 'bg-[var(--warn-bg)] border-[var(--warn)] text-[var(--warn-ink)]',
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-[12px] border-[1.5px] px-4 py-3 text-sm text-right',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('font-bold leading-snug mb-1', className)} {...props} />
  )
);
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm leading-relaxed', className)} {...props} />
  )
);
AlertDescription.displayName = 'AlertDescription';
