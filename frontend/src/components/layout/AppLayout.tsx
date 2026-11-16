import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Landmark, LogOut, PlusCircle, ListOrdered, ShieldCheck } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

export const AppLayout: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900" dir="rtl">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm group-hover:bg-emerald-700 transition-colors">
                <Landmark className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-right">
                <span className="font-bold text-lg text-slate-900 leading-tight">نايل أوبس</span>
                <span className="text-xs text-emerald-600 font-semibold tracking-wider">NileOps Bank</span>
              </div>
            </Link>

            {/* Role-based Links */}
            <nav className="hidden md:flex items-center gap-1">
              {role === 'customer' && (
                <>
                  <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`
                    }
                  >
                    <ListOrdered className="h-4 w-4" />
                    طلباتي
                  </NavLink>
                  <NavLink
                    to="/requests/new"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`
                    }
                  >
                    <PlusCircle className="h-4 w-4" />
                    طلب حساب جديد
                  </NavLink>
                </>
              )}

              {role === 'employee' && (
                <NavLink
                  to="/employee"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <ShieldCheck className="h-4 w-4" />
                  مراجعة الطلبات
                </NavLink>
              )}
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-slate-900">{user.name}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {user.role === 'employee' ? (
                      <Badge variant="warning" className="text-[11px] py-0 px-2">
                        موظف مراجعة
                      </Badge>
                    ) : (
                      <Badge variant="success" className="text-[11px] py-0 px-2">
                        عميل
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-slate-600 hover:text-rose-600 hover:border-rose-300 gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        منظومة نايل أوبس المصرفية &copy; {CURRENT_YEAR} — نظام فتح الحسابات والتحقق الآلي
      </footer>
    </div>
  );
};
