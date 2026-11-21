import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
          setError(
            detail === 'Invalid email or password'
              ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
              : detail
          );
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
    <div className="min-h-screen flex flex-wrap bg-[var(--bg)] text-[var(--ink)]" dir="rtl">
      {/* Brand Panel */}
      <div className="pat flex-1 basis-[420px] text-white p-8 sm:p-14 flex flex-col justify-between gap-10 min-h-[280px] lg:min-h-screen">
        <div className="text-[26px] sm:text-[30px] font-bold tracking-wide">
          بنك نايل أوبس <span className="text-[var(--gold-light)]">NileOps</span>
        </div>

        <div>
          <h1 className="text-[30px] sm:text-[42px] font-bold leading-[1.3] mb-3.5">
            مستنداتك تُقرأ بالذكاء الاصطناعي،
            <br />
            وقرارك يبقى بيد الموظف.
          </h1>
          <p className="text-[16px] sm:text-[18px] max-w-[460px] text-[#d6e6e4] leading-relaxed">
            قدّم طلبك من هاتفك في دقائق، وتابع كل مرحلة بوضوح وأمان.
          </p>
        </div>

        <div className="text-[14px] text-[#d6e6e4]">
          اتصال مشفّر · مراجعة بشرية نهائية لكل طلب
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 basis-[420px] flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          <h2 className="text-[28px] font-bold mb-1.5">تسجيل الدخول</h2>
          <p className="text-[var(--mut)] mb-6">أهلاً بعودتك. أدخل بياناتك للمتابعة.</p>

          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="em">البريد الإلكتروني</Label>
              <Input
                id="em"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                className="text-end"
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="pw">كلمة المرور</Label>
              <Input
                id="pw"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className="text-end"
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full" isLoading={isLoading}>
                تسجيل الدخول
              </Button>
            </div>
          </form>

          <p className="text-[14px] mt-5 text-[var(--ink)]">
            ليس لديك حساب؟{' '}
            <Link to="/register" className="text-[var(--teal)] font-semibold hover:underline">
              إنشاء حساب جديد
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
