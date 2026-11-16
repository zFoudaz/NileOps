import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, FileText } from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">طلبات فتح الحسابات</h1>
          <p className="text-sm text-slate-500 mt-1">متابعة حالة طلباتك المصرفية الحالية والسابقة</p>
        </div>
        <Link to="/requests/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            تقديم طلب حساب جديد
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الطلبات</CardTitle>
          <CardDescription>عرض شامل لجميع طلباتك المصرفية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-medium text-slate-700">لا توجد طلبات مصرفية حتى الآن</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">ابدأ الآن بتقديم طلب فتح حساب بنكي رقمي بكل سهولة</p>
            <Link to="/requests/new">
              <Button variant="outline" size="sm">
                إنشاء طلب الآن
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
