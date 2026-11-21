import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUpload } from '@/components/documents/FileUpload';
import { useRequests } from '@/hooks/useRequests';
import { useToast } from '@/hooks/useToast';
import type { BankRequest, DocumentType } from '@/types';
import {
  getSubTypeInfo,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_DESCRIPTIONS,
  REQUEST_TYPE_LABELS,
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
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback(
    (reqId: string) => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);

      let attempts = 0;
      const maxAttempts = 40;

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
              title: 'تم الانتهاء من الفحص الآلي',
            });
            navigate(`/requests/${reqId}/review`);
          } else if (attempts >= maxAttempts) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setIsProcessing(false);
            setProcessError(
              'استغرقت المعالجة وقتاً أطول من المتوقع. يمكنك تحديث الصفحة أو متابعة حالة الطلب.'
            );
          }
        } catch {
          // Continue polling
        }
      }, 2000);
    },
    [getRequest, navigate, toast]
  );

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
      toast({ variant: 'destructive', title: 'خطأ', description: msg });
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
          toast({ variant: 'destructive', title: 'خطأ', description: msg });
        }
      } finally {
        if (!ignore) setInitialLoading(false);
      }
    };
    void run();
    return () => {
      ignore = true;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [id, getRequest, startPolling, toast]);

  const handleUploadForType = async (docType: DocumentType, file: File) => {
    if (!id) return;
    try {
      await uploadDocument(id, docType, file);
      toast({
        variant: 'success',
        title: 'تم رفع المستند بنجاح',
      });
      await fetchRequestDetails();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في رفع المستند';
      toast({ variant: 'destructive', title: 'خطأ في الرفع', description: msg });
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
        title: 'جاري فحص المستندات بالذكاء الاصطناعي...',
      });
      startPolling(id);
    } catch (err: unknown) {
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : 'فشل في بدء معالجة المستندات';
      setProcessError(msg);
      toast({ variant: 'destructive', title: 'فشلت المعالجة', description: msg });
    }
  };

  if (initialLoading) {
    return (
      <Card className="py-16 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--teal)] mx-auto mb-2" />
        <p className="text-sm text-[var(--mut)]">جاري تحميل مستندات الطلب...</p>
      </Card>
    );
  }

  if (!request) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-lg font-bold text-[var(--bad)] mb-2">الطلب غير موجود</h2>
        <Link to="/dashboard">
          <Button variant="outline" size="sm">
            الرجوع للوحة التحكم
          </Button>
        </Link>
      </Card>
    );
  }

  const subTypeInfo = getSubTypeInfo(request.sub_type);
  const requestTypeLabel = REQUEST_TYPE_LABELS[request.request_type] || 'طلب مصرفي';
  const requiredDocs = request.required_documents?.length
    ? request.required_documents
    : subTypeInfo.requiredDocs;

  const uploadedDocsMap = new Map<string, (typeof request.documents)[0]>();
  for (const doc of request.documents || []) {
    uploadedDocsMap.set(doc.document_type, doc);
  }

  const uploadedCount = requiredDocs.filter((type) => uploadedDocsMap.has(type)).length;
  const isAllUploaded = requiredDocs.length > 0 && uploadedCount === requiredDocs.length;
  const progressPercent = Math.round((uploadedCount / (requiredDocs.length || 1)) * 100);

  return (
    <div className="space-y-5">
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          → رجوع
        </Button>
        <h1 className="text-[28px] font-bold mt-3.5 mb-1">رفع المستندات المطلوبة</h1>
        <p className="text-[var(--mut)] m-0">
          {requestTypeLabel} — {subTypeInfo.title} · رقم الطلب{' '}
          <span className="ltr">#{request.id.slice(0, 8).toUpperCase()}</span>
        </p>
      </div>

      {/* Progress Summary */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <b>
            تم رفع <span className="ltr">{uploadedCount}</span> من{' '}
            <span className="ltr">{requiredDocs.length}</span> مستندات
          </b>
          {isAllUploaded ? (
            <Badge variant="success">✓ اكتملت المستندات</Badge>
          ) : (
            <Badge variant="warning">متبقي {requiredDocs.length - uploadedCount}</Badge>
          )}
        </div>
        <div className="h-2 w-full bg-[var(--line)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--teal)] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </Card>

      {/* Upload Cards */}
      <div className="space-y-4">
        {requiredDocs.map((docType) => (
          <FileUpload
            key={docType}
            documentType={docType}
            label={DOCUMENT_TYPE_LABELS[docType] || docType}
            description={DOCUMENT_TYPE_DESCRIPTIONS[docType]}
            existingDoc={uploadedDocsMap.get(docType)}
            onUpload={(file) => handleUploadForType(docType, file)}
            disabled={isProcessing || request.status === 'processing'}
          />
        ))}
      </div>

      {processError && (
        <Alert variant="destructive">
          <AlertDescription>{processError}</AlertDescription>
        </Alert>
      )}

      {/* Sticky Action Bar */}
      <div className="sticky bottom-3 z-20 rounded-[14px] border border-[var(--line)] bg-[var(--card)] px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap shadow-[0_-6px_20px_rgba(20,48,47,0.12)]">
        <span className="text-[14px] text-[var(--mut)]">
          {isAllUploaded
            ? 'جميع المستندات جاهزة للفحص الآلي.'
            : 'ارفع جميع المستندات المطلوبة لبدء الفحص.'}
        </span>

        <div className="flex items-center gap-3 flex-wrap">
          {request.documents && request.documents.length > 0 && request.status !== 'pending_upload' && (
            <Link to={`/requests/${request.id}/review`}>
              <Button type="button" variant="outline" size="sm">
                مراجعة البيانات
              </Button>
            </Link>
          )}

          <Button
            type="button"
            variant="gold"
            onClick={handleStartProcessing}
            disabled={!isAllUploaded || isProcessing || apiLoading}
            isLoading={isProcessing}
          >
            معالجة المستندات
          </Button>
        </div>
      </div>

      {/* Processing Modal */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a2827]/55 p-4">
          <Card className="max-w-[420px] w-full p-6 text-center space-y-3">
            <Loader2 className="h-9 w-9 animate-spin text-[var(--teal)] mx-auto" />
            <h3 className="text-lg font-bold m-0">جاري فحص ومعالجة المستندات</h3>
            <p className="text-[14px] text-[var(--mut)] leading-relaxed m-0">
              يقرأ الذكاء الاصطناعي بيانات المستندات ويتحقق من الشروط البنكية. يرجى الانتظار لحظات...
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UploadDocumentsPage;
