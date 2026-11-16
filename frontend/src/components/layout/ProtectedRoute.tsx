import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <span className="text-sm font-medium text-slate-600">جاري التحقق من الهوية...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="h-14 w-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">غير مصرح بالوصول</h2>
          <p className="text-sm text-slate-600 mb-6">
            عذراً، حسابك الحالي ليس لديه الصلاحيات الكافية للوصول إلى هذه الصفحة.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              variant="default"
              onClick={() => {
                navigate(role === 'employee' ? '/employee' : '/dashboard');
              }}
            >
              العودة إلى لوحة التحكم
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
