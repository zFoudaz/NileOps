import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-blue-50 border-blue-200 text-blue-900',
      destructive: 'bg-rose-50 border-rose-200 text-rose-900',
      success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      warning: 'bg-amber-50 border-amber-200 text-amber-900',
    };

    const icons = {
      default: <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />,
      destructive: <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />,
      success: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />,
      warning: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />,
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-lg border p-4 text-sm flex items-start gap-3 text-right',
          variants[variant],
          className
        )}
        {...props}
      >
        {icons[variant]}
        <div className="flex-1 space-y-1">{children}</div>
      </div>
    );
  }
);
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('font-semibold leading-none tracking-tight mb-1', className)} {...props} />
  )
);
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
  )
);
AlertDescription.displayName = 'AlertDescription';
