import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const UploadDocumentsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">رفع المستندات المطلوبة</h1>
        <p className="text-sm text-slate-500 mt-1">الطلب رقم: {id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>المستندات المطلوبة للتحقق</CardTitle>
          <CardDescription>ارفع صور المستندات المطلوبة لإتمام إجراءات فتح الحساب والتحقق الآلي</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-slate-500">
            سيتم تفعيل رفع المستندات ومعالجة OCR في المهمة 9
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
