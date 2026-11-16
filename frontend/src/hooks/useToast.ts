import { useContext } from 'react';
import { ToastContext, type ToastContextType } from '@/components/ui/toastContext';

export { ToastProvider } from '@/components/ui/toast';
export type { ToastVariant, ToastItem, ToastContextType } from '@/components/ui/toastContext';

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
