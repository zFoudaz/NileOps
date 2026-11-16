import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const RequestStatusPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">تفاصيل حالة الطلب</h1>
        <p className="text-sm text-slate-500 mt-1">الطلب رقم: {id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>متابعة سير الطلب</CardTitle>
          <CardDescription>عرض حالة المعالجة وقرار التحقق الآلي أو مراجعة الموظف</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-slate-500">
            سيتم تفعيل عرض تفاصيل وحالة الطلب في المهمة 9
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
