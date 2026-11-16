import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Inbox } from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          لوحة تحكم موظف المراجعة
        </h1>
        <p className="text-sm text-slate-500 mt-1">مراجعة والبت في طلبات فتح الحسابات البنكية المحالة للتدقيق البشري</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الطلبات قيد المراجعة</CardTitle>
          <CardDescription>قائمة بالطلبات التي تتطلب اتخاذ قرار الموظف (قبول أو رفض)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <Inbox className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-medium text-slate-700">سيتم تفعيل قائمة طلبات الموظف في المهمة 10</p>
            <p className="text-sm text-slate-400 mt-1">جداول الفرز والتصفية والمراجعة السريعة</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
