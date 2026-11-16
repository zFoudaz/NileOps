import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const EmployeeRequestDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">مراجعة وتدقيق الطلب</h1>
        <p className="text-sm text-slate-500 mt-1">الطلب رقم: {id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تدقيق المستندات والتحقق وقواعد الأعمال</CardTitle>
          <CardDescription>فحص صور المستندات المرفوعة ومقارنتها بالبيانات وقرار الموافقة أو الرفض</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-slate-500">
            سيتم تفعيل شاشة تدقيق الموظف واتخاذ القرار في المهمة 10
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
