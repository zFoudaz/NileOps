import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export const AppLayout: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const homePath = role === 'employee' ? '/employee' : '/dashboard';
  const roleLabel = user?.role === 'employee' ? 'موظف' : 'عميل';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)]" dir="rtl">
      <header className="sticky top-0 z-40 bg-[var(--teal)] text-white px-4 sm:px-7 py-3">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <Link to={homePath} className="font-bold text-[20px] tracking-tight text-white hover:opacity-95">
            نايل أوبس <span className="text-[var(--gold-light)]">NileOps</span>
          </Link>

          <div className="flex items-center gap-3 flex-wrap">
            {user && (
              <span className="text-[14px] text-white/95 sm:border-s sm:border-white/35 sm:ps-3">
                {user.name} — {roleLabel}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-white border-white hover:bg-white/10 hover:text-white"
            >
              خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-5 pt-7 pb-16">
        <Outlet />
      </main>
    </div>
  );
};
