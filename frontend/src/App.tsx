import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ToastProvider } from '@/hooks/useToast';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { DashboardPage } from '@/pages/customer/DashboardPage';
import { NewRequestPage } from '@/pages/customer/NewRequestPage';
import { UploadDocumentsPage } from '@/pages/customer/UploadDocumentsPage';
import { ReviewDataPage } from '@/pages/customer/ReviewDataPage';
import { RequestStatusPage } from '@/pages/customer/RequestStatusPage';
import { EmployeeDashboardPage } from '@/pages/employee/DashboardPage';
import { EmployeeRequestDetailPage } from '@/pages/employee/RequestDetailPage';
import { Loader2 } from 'lucide-react';

const RootRedirect: React.FC = () => {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] gap-3" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--teal)]" />
        <span className="text-sm font-medium text-[var(--mut)]">جاري التحميل...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'employee') {
    return <Navigate to="/employee" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] gap-3" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--teal)]" />
        <span className="text-sm font-medium text-[var(--mut)]">جاري التحميل...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={role === 'employee' ? '/employee' : '/dashboard'} replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />

            {/* Root Redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Authenticated Layout Routes */}
            <Route element={<AppLayout />}>
              {/* Customer Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute requiredRole="customer">
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/requests/new"
                element={
                  <ProtectedRoute requiredRole="customer">
                    <NewRequestPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/requests/:id/upload"
                element={
                  <ProtectedRoute requiredRole="customer">
                    <UploadDocumentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/requests/:id/review"
                element={
                  <ProtectedRoute requiredRole="customer">
                    <ReviewDataPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/requests/:id"
                element={
                  <ProtectedRoute requiredRole="customer">
                    <RequestStatusPage />
                  </ProtectedRoute>
                }
              />

              {/* Employee Routes */}
              <Route
                path="/employee"
                element={
                  <ProtectedRoute requiredRole="employee">
                    <EmployeeDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employee/requests/:id"
                element={
                  <ProtectedRoute requiredRole="employee">
                    <EmployeeRequestDetailPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
