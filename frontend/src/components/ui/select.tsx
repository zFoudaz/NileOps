import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

interface SelectContextType {
  value: string;
  onValueChange: (val: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  labels: Record<string, string>;
  registerLabel: (val: string, label: string) => void;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  children,
}) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = (newVal: string) => {
    if (!isControlled) {
      setUncontrolledValue(newVal);
    }
    onValueChange?.(newVal);
  };

  const registerLabel = (val: string, label: string) => {
    setLabels((prev) => (prev[val] === label ? prev : { ...prev, [val]: label }));
  };

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
    <SelectContext.Provider
      value={{
        value,
        onValueChange: handleValueChange,
        open,
        setOpen,
        labels,
        registerLabel,
      }}
    >
      <div ref={containerRef} className="relative inline-block w-full text-right">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectTrigger must be inside Select');

  return (
    <button
      ref={ref}
      type="button"
      role="combobox"
      aria-expanded={context.open}
      onClick={() => context.setOpen((prev) => !prev)}
      className={cn(
        'flex min-h-[44px] w-full items-center justify-between rounded-[10px] border-[1.5px] border-[var(--input-border)] bg-white px-3 py-2 text-[14px] text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50 text-right',
        className
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      <ChevronDown className="h-4 w-4 text-[var(--mut)] shrink-0 mr-2" />
    </button>
  );
});
SelectTrigger.displayName = 'SelectTrigger';

export const SelectValue: React.FC<{
  placeholder?: string;
  className?: string;
}> = ({ placeholder, className }) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectValue must be inside Select');

  const display = context.labels[context.value] || context.value || placeholder;

  return (
    <span className={cn('text-[14px]', !context.value && 'text-[var(--mut)]', className)}>
      {display}
    </span>
  );
};

export const SelectContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectContent must be inside Select');

  if (!context.open) return null;

  return (
    <div
      className={cn(
        'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-[10px] border border-[var(--line)] bg-[var(--card)] p-1 shadow-lg text-right',
        className
      )}
    >
      {children}
    </div>
  );
};

export const SelectItem: React.FC<{
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}> = ({ value, children, className, disabled }) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectItem must be inside Select');

  const { registerLabel } = context;

  useEffect(() => {
    if (typeof children === 'string') {
      registerLabel(value, children);
    }
  }, [value, children, registerLabel]);

  const isSelected = context.value === value;

  const handleSelect = () => {
    if (disabled) return;
    context.onValueChange(value);
    context.setOpen(false);
  };

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={handleSelect}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center justify-between rounded-[8px] py-2 px-3 text-[14px] outline-none transition-colors hover:bg-[var(--hover-row)] text-[var(--ink)]',
        isSelected && 'bg-[var(--in-bg)] text-[var(--teal)] font-semibold',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      <span className="truncate">{children}</span>
      {isSelected && <Check className="h-4 w-4 text-[var(--teal)] shrink-0" />}
    </div>
  );
};
