import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const NewRequestPage: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">طلب فتح حساب جديد</h1>
        <p className="text-sm text-slate-500 mt-1">اختر نوع الحساب وأكمل البيانات المطلوبة</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>نوع الحساب المصرفي</CardTitle>
          <CardDescription>حدد نوع الحساب الذي ترغب في فتحه لدى نايل أوبس</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-slate-500">
            سيتم تفعيل نموذج تقديم الطلب بالكامل في المهمة 9
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
