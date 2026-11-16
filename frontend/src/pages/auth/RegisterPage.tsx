import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Landmark, UserPlus } from 'lucide-react';
import axios from 'axios';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (password.length < 8) {
      setError('يجب ألا تقل كلمة المرور عن 8 أحرف');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمة المرور وتأكيد كلمة المرور غير متطابقين');
      return;
    }

    try {
      setIsLoading(true);
      await register(name.trim(), email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === 'string') {
          setError(detail === 'Email already registered' ? 'هذا البريد الإلكتروني مسجل بالفعل' : detail);
        } else {
          setError('فشل إنشاء الحساب. يرجى مراجعة البيانات المدخلة والمحاولة مرة أخرى.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('حدث خطأ غير متوقع أثناء إنشاء الحساب');
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
          <p className="text-sm text-slate-500 mt-1">فتح حساب بنكي جديد بخطوات سريعة وآمنة</p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">إنشاء حساب جديد</CardTitle>
            <CardDescription>أدخل بياناتك للتسجيل والبدء بتقديم طلب فتح الحساب</CardDescription>
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
                <Label htmlFor="name" required>
                  الاسم الكامل
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="محمد أحمد إبراهيم"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

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
                  placeholder="•••••••• (8 أحرف على الأقل)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  className="text-left font-mono"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" required>
                  تأكيد كلمة المرور
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  dir="ltr"
                  className="text-left font-mono"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                <UserPlus className="h-4 w-4 ml-1" />
                إنشاء الحساب
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 text-center border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-600">
              لديك حساب بالفعل؟{' '}
              <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700 underline">
                تسجيل الدخول
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
