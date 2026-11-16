import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const ReviewDataPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">مراجعة البيانات المستخرجة</h1>
        <p className="text-sm text-slate-500 mt-1">الطلب رقم: {id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>البيانات المستخرجة بالذكاء الاصطناعي وOCR</CardTitle>
          <CardDescription>يرجى تدقيق البيانات وتصحيح أي خطأ قبل الإرسال النهائي</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-slate-500">
            سيتم تفعيل شاشة مراجعة وتصحيح البيانات في المهمة 9
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
