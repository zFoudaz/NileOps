import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Landmark,
  LogOut,
  PlusCircle,
  ListOrdered,
  ShieldCheck,
  Menu,
  X,
  User as UserIcon,
  ChevronDown,
} from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

export const AppLayout: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    ...(role === 'customer'
      ? [
          { to: '/dashboard', label: 'طلباتي', icon: ListOrdered },
          { to: '/requests/new', label: 'طلب جديد', icon: PlusCircle },
        ]
      : []),
    ...(role === 'employee'
      ? [
          { to: '/employee', label: 'الطلبات', icon: ShieldCheck },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900" dir="rtl">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Mobile Menu Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              aria-label="القائمة الرئيسية"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <NavLink to="/" className="flex items-center gap-2.5 group">
              <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm group-hover:bg-emerald-700 transition-colors">
                <Landmark className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-right">
                <span className="font-bold text-lg text-slate-900 leading-tight">نايل أوبس</span>
                <span className="text-xs text-emerald-600 font-semibold tracking-wider">NileOps Bank</span>
              </div>
            </NavLink>
          </div>

          {/* User Profile Dropdown Menu */}
          <div className="flex items-center gap-3">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <div className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      {user.name.charAt(0) || <UserIcon className="h-4 w-4" />}
                    </div>
                    <div className="hidden sm:flex flex-col text-right">
                      <span className="text-xs font-semibold text-slate-900 leading-tight">
                        {user.name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {user.role === 'employee' ? 'موظف مراجعة' : 'عميل'}
                      </span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 mr-1" />
                  </div>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="font-bold text-slate-900">{user.name}</div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{user.email}</div>
                    <div className="mt-1.5">
                      <Badge variant={user.role === 'employee' ? 'warning' : 'success'}>
                        {user.role === 'employee' ? 'موظف مراجعة' : 'عميل'}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <DropdownMenuItem
                        key={link.to}
                        onClick={() => navigate(link.to)}
                      >
                        <Icon className="h-4 w-4 text-slate-500 ml-1.5" />
                        {link.label}
                      </DropdownMenuItem>
                    );
                  })}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <LogOut className="h-4 w-4 ml-1.5" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="hidden md:inline-flex text-slate-600 hover:text-rose-600 hover:border-rose-300 gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              <span>خروج</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex w-full">
        {/* Desktop Sidebar (Role-based) */}
        <aside className="hidden md:flex flex-col w-64 border-l border-slate-200 bg-white p-4 shrink-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
            لوحة التنقل
          </div>

          <nav className="flex-1 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0 text-current" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Sidebar Footer info */}
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 text-center">
            منظومة نايل أوبس الرقمية v1.0
          </div>
        </aside>

        {/* Mobile Navigation Drawer Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="fixed inset-y-0 right-0 w-3/4 max-w-xs bg-white p-6 shadow-2xl flex flex-col z-50 text-right animate-in slide-in-from-right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-slate-900">نايل أوبس</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {user && (
                <div className="py-4 border-b border-slate-100">
                  <div className="text-sm font-bold text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                  <div className="mt-1">
                    <Badge variant={user.role === 'employee' ? 'warning' : 'success'}>
                      {user.role === 'employee' ? 'موظف مراجعة' : 'عميل'}
                    </Badge>
                  </div>
                </div>
              )}

              <nav className="flex-1 py-4 space-y-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-800 font-semibold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0 text-current" />
                      <span>{link.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full text-rose-600 hover:bg-rose-50 hover:border-rose-300 justify-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  تسجيل الخروج
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace / Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
            منظومة نايل أوبس المصرفية &copy; {CURRENT_YEAR} — نظام فتح الحسابات والتحقق الآلي
          </footer>
        </div>
      </div>
    </div>
  );
};
