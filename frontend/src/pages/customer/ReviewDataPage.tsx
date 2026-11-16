import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  ShieldAlert,
  Send,
  Loader2,
  ArrowRight,
  Eye,
  RefreshCw,
  Sparkles,
  Info,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ExtractedDataForm } from '@/components/requests/ExtractedDataForm';
import { ValidationBadge } from '@/components/requests/ValidationBadge';
import { useRequests } from '@/hooks/useRequests';
import { useToast } from '@/hooks/useToast';
import type { ExtractedDataResponse, DocumentExtractedData } from '@/types';
import { DOCUMENT_TYPE_LABELS, AUTO_DECISION_LABELS } from '@/lib/constants';
import { resolveImageUrl } from '@/lib/api';

export const ReviewDataPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getExtractedData, submitForReview, isLoading: hookLoading } = useRequests();
  const { toast } = useToast();

  const [extractedData, setExtractedData] = useState<ExtractedDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getExtractedData(id);
      setExtractedData(data);
      if (data.documents && data.documents.length > 0) {
        setActiveTab((prev) => prev || (data.documents[0].document_id || data.documents[0].id));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في تحميل البيانات المستخرجة';
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  }, [id, getExtractedData, toast]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getExtractedData(id);
        if (!ignore) {
          setExtractedData(data);
          if (data.documents && data.documents.length > 0) {
            setActiveTab((prev) => prev || (data.documents[0].document_id || data.documents[0].id));
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'فشل في تحميل البيانات المستخرجة';
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description: msg,
          });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [id, getExtractedData, toast]);

  const handleSubmitReview = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
      await submitForReview(id);
      toast({
        variant: 'success',
        title: 'تم إرسال الطلب للمراجعة بنجاح',
        description: 'تم إرسال كافة البيانات والمستندات لموظف البنك المختص للمراجعة والاعتماد.',
      });
      navigate(`/requests/${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في إرسال الطلب للمراجعة';
      toast({
        variant: 'destructive',
        title: 'فشل الإرسال',
        description: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocumentUpdated = () => {
    // Re-fetch extracted data to refresh validations and values
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
        <span className="text-sm font-medium text-slate-600">جاري قراءة البيانات المستخرجة...</span>
      </div>
    );
  }

  if (!extractedData || !id) {
    return (
      <div className="max-w-2xl mx-auto rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-rose-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-rose-900">تعذر تحميل بيانات المراجعة</h2>
        <p className="text-xs text-rose-700 mt-1 mb-4">
          يرجى التأكد من معالجة المستندات أولاً قبل فتح صفحة المراجعة.
        </p>
        <Link to={`/requests/${id}/upload`}>
          <Button variant="outline" size="sm">
            الرجوع لرفع ومعالجة المستندات
          </Button>
        </Link>
      </div>
    );
  }

  const isReadOnly =
    extractedData.status === 'pending_review' ||
    extractedData.status === 'approved' ||
    extractedData.status === 'rejected';

  const documents = extractedData.documents || [];
  const validations = extractedData.validation_results || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              #{id.slice(0, 8).toUpperCase()}
            </span>
            <Badge variant="outline" className="text-xs">
              مراجعة وتدقيق البيانات
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">مراجعة البيانات المستخرجة</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            يرجى التأكد من دقة البيانات المستخرجة آلياً وتصحيح أي خطأ قبل الإرسال النهائي
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={hookLoading}
            className="gap-1.5 text-xs text-slate-600"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${hookLoading ? 'animate-spin' : ''}`} />
            تحديث البيانات
          </Button>
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-600">
              لوحة التحكم
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Pending Employee Review Banner */}
      {extractedData.status === 'pending_review' && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-5 shadow-xs flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-indigo-950">
                تم إرسال هذا الطلب بنجاح وهو الآن قيد تدقيق ومراجعة موظف البنك
              </h3>
              <Badge variant="default" className="text-xs bg-indigo-600 hover:bg-indigo-700">
                قيد المراجعة
              </Badge>
            </div>
            <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
              تم استلام كافة البيانات والمستندات وجاري فحصها من قبل مسؤول فتح الحسابات. لا يمكن تعديل البيانات أثناء هذه المرحلة.
            </p>
          </div>
        </div>
      )}

      {/* Auto Decision Banner */}
      {extractedData.auto_decision === 'auto_approved' && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-5 shadow-xs flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-emerald-950">
                {AUTO_DECISION_LABELS.auto_approved}
              </h3>
              <Badge variant="success" className="text-xs">
                مطابق 100%
              </Badge>
            </div>
            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
              اجتازت المستندات كافة قواعد التحقق الآلي والامتثال بنجاح (سريان البطاقة، تطابق السن، ومطابقة البيانات). يمكنك الآن تأكيد الإرسال للمراجعة النهائية لدى الموظف.
            </p>
          </div>
        </div>
      )}

      {extractedData.auto_decision === 'auto_rejected' && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50/80 p-5 shadow-xs flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-rose-950">
                {AUTO_DECISION_LABELS.auto_rejected}
              </h3>
              <Badge variant="destructive" className="text-xs">
                يتطلب معالجة
              </Badge>
            </div>
            <p className="text-xs text-rose-800 mt-1 leading-relaxed">
              توجد قواعد تحقق آلية لم يتم استيفاؤها (مثل انتهاء صلاحية بطاقة الرقم القومي أو عدم تطابق السن مع فئة الحساب). يرجى مراجعة تفاصيل الفحص أدناه أو تصحيح البيانات غير المقفلة.
            </p>
          </div>
        </div>
      )}

      {/* Validation Rules Summary Section */}
      {validations.length > 0 && (
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">نتائج التحقق الآلي والقواعد المصرفية</h3>
              </div>
              <span className="text-xs text-slate-400">
                {validations.filter((v) => v.passed).length} من {validations.length} قواعد مستوفاة
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {validations.map((v) => (
                <ValidationBadge key={v.id || v.rule_name} validation={v} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Extracted Data Tabs */}
      {documents.length > 0 ? (
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-5">
            <Tabs
              value={activeTab || (documents[0]?.document_id || documents[0]?.id)}
              onValueChange={setActiveTab}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2 mb-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">تدقيق بيانات المستندات</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    اختر المستند لتعديل البيانات غير المقفلة وحفظها
                  </p>
                </div>

                <TabsList className="bg-slate-100 p-1 flex-wrap h-auto">
                  {documents.map((doc: DocumentExtractedData) => {
                    const docId = doc.document_id || doc.id;
                    const label = DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type;
                    return (
                      <TabsTrigger
                        key={docId}
                        value={docId}
                        className="text-xs py-1.5 px-3 data-[state=active]:bg-white data-[state=active]:shadow-xs"
                      >
                        {label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              {documents.map((doc: DocumentExtractedData) => {
                const docId = doc.document_id || doc.id;
                const rawUrl = doc.image_url || doc.file_path;
                const docImgUrl = rawUrl ? resolveImageUrl(rawUrl) : null;

                return (
                  <TabsContent key={docId} value={docId} className="space-y-6 pt-2">
                    {docImgUrl && (
                      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <span>صورة المستند المرفوعة:</span>
                          <span className="font-mono text-[11px] text-slate-500 truncate max-w-xs">
                            {doc.file_path}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewImage(docImgUrl)}
                          className="gap-1.5 text-xs text-slate-700 h-8"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          معاينة الصورة الأصلية
                        </Button>
                      </div>
                    )}

                    <ExtractedDataForm
                      requestId={id}
                      docExtractedData={doc}
                      validationResults={validations}
                      onSaved={handleDocumentUpdated}
                      isReadOnly={isReadOnly}
                    />
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Info className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">لا توجد مستندات مستخرجة للعرض</p>
          <p className="text-xs text-slate-500 mt-1">
            يرجى التأكد من رفع ومعالجة المستندات أولاً.
          </p>
          <Link to={`/requests/${id}/upload`}>
            <Button variant="outline" size="sm" className="mt-3">
              الذهاب لرفع المستندات
            </Button>
          </Link>
        </div>
      )}

      {/* Submission Footer */}
      <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            {isReadOnly
              ? 'الطلب في مرحلة المراجعة أو تم البت فيه. لا يمكن تعديل البيانات حالياً.'
              : 'عند التأكد من صحة كافة البيانات المستخرجة، اضغط على زر إرسال الطلب للمراجعة النهائية.'}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link to={`/requests/${id}/upload`} className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs">
              تعديل المستندات
            </Button>
          </Link>

          {!isReadOnly && (
            <Button
              type="button"
              onClick={handleSubmitReview}
              disabled={submitting || hookLoading}
              className="gap-2 w-full sm:w-auto font-medium"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  إرسال للمراجعة النهائية
                </>
              )}
            </Button>
          )}

          {isReadOnly && (
            <Link to={`/requests/${id}`} className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto text-xs gap-1.5">
                متابعة حالة الطلب
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-semibold text-slate-900">معاينة صورة المستند</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewImage(null)}
                className="h-8 px-2 text-slate-500 hover:text-slate-800"
              >
                إغلاق ✕
              </Button>
            </div>
            <div className="overflow-auto mt-3 flex items-center justify-center max-h-[75vh]">
              <img
                src={previewImage}
                alt="معاينة المستند"
                className="max-h-[75vh] w-auto rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewDataPage;
