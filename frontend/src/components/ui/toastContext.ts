import { createContext } from 'react';

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning';

export interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastContextType {
  toasts: ToastItem[];
  toast: (options: Omit<ToastItem, 'id'>) => string;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
