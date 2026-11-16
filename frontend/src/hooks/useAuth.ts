import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '@/context/authContextDef';

export { AuthProvider } from '@/context/AuthContext';
export type { AuthContextType } from '@/context/authContextDef';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
