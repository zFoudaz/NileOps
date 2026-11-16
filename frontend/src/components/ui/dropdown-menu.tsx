import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface DropdownMenuContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropdownMenuContext = createContext<DropdownMenuContextType | undefined>(undefined);

export const DropdownMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div ref={containerRef} className="relative inline-block text-right">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
};

export const DropdownMenuTrigger: React.FC<{
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}> = ({ children, className }) => {
  const context = useContext(DropdownMenuContext);
  if (!context) throw new Error('DropdownMenuTrigger must be inside DropdownMenu');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => context.setOpen((prev) => !prev)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          context.setOpen((prev) => !prev);
        }
      }}
      className={cn('cursor-pointer inline-flex items-center', className)}
    >
      {children}
    </div>
  );
};

export const DropdownMenuContent: React.FC<{
  children: React.ReactNode;
  align?: 'start' | 'end' | 'center';
  className?: string;
}> = ({ children, align = 'end', className }) => {
  const context = useContext(DropdownMenuContext);
  if (!context) throw new Error('DropdownMenuContent must be inside DropdownMenu');

  if (!context.open) return null;

  const alignStyles = {
    start: 'right-0',
    end: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={cn(
        'absolute z-50 mt-2 min-w-[12rem] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 text-slate-800 shadow-lg animate-in fade-in-80 zoom-in-95',
        alignStyles[align],
        className
      )}
    >
      {children}
    </div>
  );
};

export const DropdownMenuItem: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}> = ({ children, onClick, className, disabled }) => {
  const context = useContext(DropdownMenuContext);

  const handleClick = () => {
    if (disabled) return;
    if (onClick) onClick();
    context?.setOpen(false);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm text-right font-medium outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 disabled:pointer-events-none disabled:opacity-50 gap-2',
        className
      )}
    >
      {children}
    </button>
  );
};

export const DropdownMenuLabel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('px-3 py-1.5 text-xs font-semibold text-slate-500', className)}>
    {children}
  </div>
);

export const DropdownMenuSeparator: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('-mx-1 my-1 h-px bg-slate-100', className)} />
);
