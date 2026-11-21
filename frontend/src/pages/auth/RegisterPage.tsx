import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
          setError(
            detail === 'Email already registered'
              ? 'هذا البريد الإلكتروني مسجل بالفعل'
              : detail
          );
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
            أنشئ حسابك الآن وقدّم طلب فتح حساب أو إصدار بطاقة في دقائق.
          </p>
        </div>

        <div className="text-[14px] text-[#d6e6e4]">
          اتصال مشفّر · مراجعة بشرية نهائية لكل طلب
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 basis-[420px] flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          <h2 className="text-[28px] font-bold mb-1.5">إنشاء حساب جديد</h2>
          <p className="text-[var(--mut)] mb-6">أدخل بياناتك للبدء في تقديم طلباتك المصرفية.</p>

          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input
                id="name"
                type="text"
                placeholder="منى حسن عبد الرحمن"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
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
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                placeholder="8 أحرف على الأقل"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className="text-end"
                required
                minLength={8}
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                dir="ltr"
                className="text-end"
                required
                minLength={8}
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full" isLoading={isLoading}>
                إنشاء الحساب
              </Button>
            </div>
          </form>

          <p className="text-[14px] mt-5 text-[var(--ink)]">
            لديك حساب بالفعل؟{' '}
            <Link to="/login" className="text-[var(--teal)] font-semibold hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
