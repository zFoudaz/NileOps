import React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn('block text-[14px] font-semibold text-[var(--ink)] mb-1.5 text-right select-none', className)}
        {...props}
      >
        {children}
        {required && <span className="text-[var(--bad)] mr-1">*</span>}
      </label>
    );
  }
);
Label.displayName = 'Label';
