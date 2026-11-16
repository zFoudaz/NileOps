import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileCheck,
  Loader2,
  AlertTriangle,
  Play,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileUpload } from '@/components/documents/FileUpload';
import { useRequests } from '@/hooks/useRequests';
import { useToast } from '@/hooks/useToast';
import type { BankRequest, DocumentType } from '@/types';
import {
  ACCOUNT_TYPES_INFO,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_DESCRIPTIONS,
} from '@/lib/constants';

export const UploadDocumentsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRequest, uploadDocument, processDocuments, isLoading: apiLoading } = useRequests();
  const { toast } = useToast();

  const [request, setRequest] = useState<BankRequest | null>(null);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = useCallback((reqId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    let attempts = 0;
    const maxAttempts = 40; // 40 * 2s = 80 seconds max

    pollTimerRef.current = setInterval(async () => {
      attempts++;
      try {
        const latest = await getRequest(reqId);
        setRequest(latest);

        if (latest.status !== 'processing') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setIsProcessing(false);
          toast({
            variant: 'success',
            title: 'تم الانتهاء من المعالجة بنجاح',
            description: 'تم استخراج البيانات والتحقق من القواعد الآلية، جاري تحويلك للمراجعة.',
          });
          navigate(`/requests/${reqId}/review`);
        } else if (attempts >= maxAttempts) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setIsProcessing(false);
          setProcessError('استغرقت المعالجة وقتاً أطول من المتوقع. يمكنك تحديث الصفحة أو متابعة حالة الطلب.');
        }
      } catch {
        // Continue polling
      }
    }, 2000);
  }, [getRequest, navigate, toast]);

  const fetchRequestDetails = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getRequest(id);
      setRequest(data);
      if (data.status === 'processing') {
        setIsProcessing(true);
        startPolling(id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في تحميل تفاصيل الطلب';
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: msg,
      });
    } finally {
      setInitialLoading(false);
    }
  }, [id, getRequest, startPolling, toast]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!id) return;
      try {
        const data = await getRequest(id);
        if (!ignore) {
          setRequest(data);
          if (data.status === 'processing') {
            setIsProcessing(true);
            startPolling(id);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'فشل في تحميل تفاصيل الطلب';
          toast({
            variant: 'destructive',
            title: 'خطأ',
            description: msg,
          });
        }
      } finally {
        if (!ignore) {
          setInitialLoading(false);
        }
      }
    };
    void run();
    return () => {
      ignore = true;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [id, getRequest, startPolling, toast]);

  const handleUploadForType = async (docType: DocumentType, file: File) => {
    if (!id) return;
    try {
      await uploadDocument(id, docType, file);
      toast({
        variant: 'success',
        title: 'تم رفع المستند بنجاح',
        description: `تم رفع ${DOCUMENT_TYPE_LABELS[docType] || docType} وحفظه في سجل الطلب.`,
      });
      // Refresh request to update documents list
      await fetchRequestDetails();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في رفع المستند';
      toast({
        variant: 'destructive',
        title: 'خطأ في الرفع',
        description: msg,
      });
      throw err;
    }
  };

  const handleStartProcessing = async () => {
    if (!id) return;
    setProcessError(null);
    setIsProcessing(true);

    try {
      await processDocuments(id);
      toast({
        variant: 'default',
        title: 'بدأت عملية الفحص والمعالجة',
        description: 'يقوم الذكاء الاصطناعي الآن بقراءة وفحص المستندات والتحقق من القواعد البنكية...',
      });
      startPolling(id);
    } catch (err: unknown) {
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : 'فشل في بدء معالجة المستندات';
      setProcessError(msg);
      toast({
        variant: 'destructive',
        title: 'فشلت المعالجة',
        description: msg,
      });
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
        <span className="text-sm font-medium text-slate-600">جاري تحميل مستندات الطلب...</span>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-2xl mx-auto rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-rose-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-rose-900">الطلب غير موجود</h2>
        <p className="text-xs text-rose-700 mt-1 mb-4">
          تعذر العثور على بيانات الطلب المطلوب، يرجى التأكد من الرابط.
        </p>
        <Link to="/dashboard">
          <Button variant="outline" size="sm">
            الرجوع إلى لوحة التحكم
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate required docs from account type
  const accountInfo =
    ACCOUNT_TYPES_INFO[request.sub_type as keyof typeof ACCOUNT_TYPES_INFO] || {
      title: request.sub_type,
      requiredDocs: request.required_documents || [],
    };
  const requiredDocs = request.required_documents?.length
    ? request.required_documents
    : accountInfo.requiredDocs;

  // Build map of uploaded docs
  const uploadedDocsMap = new Map<string, typeof request.documents[0]>();
  for (const doc of request.documents || []) {
    uploadedDocsMap.set(doc.document_type, doc);
  }

  const uploadedCount = requiredDocs.filter((type) => uploadedDocsMap.has(type)).length;
  const isAllUploaded = requiredDocs.length > 0 && uploadedCount === requiredDocs.length;
  const progressPercent = Math.round((uploadedCount / (requiredDocs.length || 1)) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              #{request.id.slice(0, 8).toUpperCase()}
            </span>
            <Badge variant="outline" className="text-xs">
              {accountInfo.title}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">رفع المستندات المطلوبة</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            يرجى تصوير المستندات بوضوح في إضاءة جيدة لتسهيل قراءتها آلياً
          </p>
        </div>

        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-600">
            العودة للوحة التحكم
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Progress & Checklist Summary Card */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <span className="text-xs font-semibold text-slate-500">حالة اكتمال المستندات المطلوبة</span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                تم رفع {uploadedCount} من إجمالي {requiredDocs.length} مستندات
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {isAllUploaded ? (
                <Badge variant="success" className="gap-1 text-xs px-3 py-1">
                  <FileCheck className="h-3.5 w-3.5" />
                  اكتملت جميع المستندات المطلوبة
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">
                  متبقي {requiredDocs.length - uploadedCount} مستندات
                </Badge>
              )}
            </div>
          </div>

          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Quick Checklist Badges */}
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
            {requiredDocs.map((docType) => {
              const isUploaded = uploadedDocsMap.has(docType);
              return (
                <div
                  key={docType}
                  className={`text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 border transition ${
                    isUploaded
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isUploaded ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  />
                  <span>{DOCUMENT_TYPE_LABELS[docType] || docType}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upload Zones List */}
      <div className="space-y-4">
        {requiredDocs.map((docType) => {
          const existing = uploadedDocsMap.get(docType);
          return (
            <FileUpload
              key={docType}
              documentType={docType}
              label={DOCUMENT_TYPE_LABELS[docType] || docType}
              description={DOCUMENT_TYPE_DESCRIPTIONS[docType]}
              existingDoc={existing}
              onUpload={(file) => handleUploadForType(docType, file)}
              disabled={isProcessing || request.status === 'processing'}
            />
          );
        })}
      </div>

      {processError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">تنبيه أثناء المعالجة:</p>
            <p className="mt-0.5">{processError}</p>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Info className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            {isAllUploaded
              ? 'جميع المستندات مكتملة، يمكنك الآن بدء الفحص الآلي واستخراج البيانات.'
              : 'يرجى استكمال رفع جميع المستندات المطلوبة لتفعيل زر المعالجة والفحص.'}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {request.documents && request.documents.length > 0 && request.status !== 'pending_upload' && (
            <Link to={`/requests/${request.id}/review`} className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs">
                الانتقال للمراجعة
              </Button>
            </Link>
          )}

          <Button
            type="button"
            onClick={handleStartProcessing}
            disabled={!isAllUploaded || isProcessing || apiLoading}
            className="gap-2 w-full sm:w-auto font-medium"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري المعالجة الآلية...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                معالجة المستندات
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Full-screen / Modal processing overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 text-center shadow-2xl space-y-4" dir="rtl">
            <div className="h-16 w-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center animate-pulse">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">جاري فحص ومعالجة المستندات</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                يقوم نظام الذكاء الاصطناعي الآن بقراءة النصوص والأرقام من الصور ومطابقة الشروط البنكية آلياً. يرجى الانتظار لحظات...
              </p>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 animate-[pulse_1.5s_ease-in-out_infinite] w-3/4 mx-auto rounded-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadDocumentsPage;
