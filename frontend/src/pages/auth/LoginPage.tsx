import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Landmark, LogIn } from 'lucide-react';
import axios from 'axios';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      setIsLoading(true);
      const user = await login(email.trim(), password);
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'employee') {
        navigate('/employee', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === 'string') {
          setError(detail === 'Invalid email or password' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : detail);
        } else {
          setError('فشل تسجيل الدخول. يرجى التحقق من صحة البيانات والمحاولة مجدداً.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('حدث خطأ غير متوقع أثناء تسجيل الدخول');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md mb-3">
            <Landmark className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">نايل أوبس | NileOps</h1>
          <p className="text-sm text-slate-500 mt-1">منظومة فتح الحسابات البنكية الرقمية</p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
            <CardDescription>أدخل بيانات اعتمادك للمتابعة إلى حسابك</CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4">
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" required>
                  البريد الإلكتروني
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  className="text-left font-mono"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="password" required>
                  كلمة المرور
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  className="text-left font-mono"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                <LogIn className="h-4 w-4 ml-1" />
                تسجيل الدخول
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 text-center border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-600">
              ليس لديك حساب؟{' '}
              <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-700 underline">
                إنشاء حساب جديد
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
