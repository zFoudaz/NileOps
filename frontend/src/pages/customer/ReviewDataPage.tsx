import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog } from '@/components/ui/dialog';
import { ExtractedDataForm } from '@/components/requests/ExtractedDataForm';
import { ValidationBadge } from '@/components/requests/ValidationBadge';
import { useRequests } from '@/hooks/useRequests';
import { useToast } from '@/hooks/useToast';
import type { ExtractedDataResponse, DocumentExtractedData } from '@/types';
import { DOCUMENT_TYPE_LABELS } from '@/lib/constants';
import { resolveImageUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

export const ReviewDataPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getExtractedData, submitForReview, isLoading: hookLoading } = useRequests();
  const { toast } = useToast();

  const [extractedData, setExtractedData] = useState<ExtractedDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [activeDocId, setActiveDocId] = useState<string>('');
  const [zoomed, setZoomed] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getExtractedData(id);
      setExtractedData(data);
      if (data.documents && data.documents.length > 0) {
        setActiveDocId((prev) => prev || data.documents[0].document_id || data.documents[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في تحميل البيانات المستخرجة';
      toast({ variant: 'destructive', title: 'خطأ', description: msg });
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
            setActiveDocId((prev) => prev || data.documents[0].document_id || data.documents[0].id);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'فشل في تحميل البيانات المستخرجة';
          toast({ variant: 'destructive', title: 'خطأ', description: msg });
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [id, getExtractedData, toast]);

  const handleConfirmSubmit = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
      await submitForReview(id);
      setConfirmOpen(false);
      toast({
        variant: 'success',
        title: 'تم إرسال طلبك للمراجعة',
      });
      navigate(`/requests/${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في إرسال الطلب للمراجعة';
      toast({ variant: 'destructive', title: 'فشل الإرسال', description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="py-16 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--teal)] mx-auto mb-2" />
        <p className="text-sm text-[var(--mut)]">جاري قراءة البيانات المستخرجة...</p>
      </Card>
    );
  }

  if (!extractedData || !id) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-lg font-bold text-[var(--bad)] mb-2">تعذر تحميل بيانات المراجعة</h2>
        <p className="text-sm text-[var(--mut)] mb-4">
          يرجى التأكد من رفع ومعالجة المستندات أولاً.
        </p>
        <Link to={`/requests/${id}/upload`}>
          <Button variant="outline" size="sm">
            الرجوع لرفع المستندات
          </Button>
        </Link>
      </Card>
    );
  }

  const isReadOnly =
    extractedData.status === 'pending_review' ||
    extractedData.status === 'approved' ||
    extractedData.status === 'rejected';

  const documents = extractedData.documents || [];
  const validations = extractedData.validation_results || [];
  const hasFailedValidation = validations.some((v) => !v.passed);

  const activeDoc: DocumentExtractedData | undefined =
    documents.find((d) => (d.document_id || d.id) === activeDocId) || documents[0];
  const rawImgUrl = activeDoc ? activeDoc.image_url || activeDoc.file_path : null;
  const activeImgUrl = rawImgUrl ? resolveImageUrl(rawImgUrl) : null;
  const activeDocLabel = activeDoc
    ? DOCUMENT_TYPE_LABELS[activeDoc.document_type] || activeDoc.document_type
    : 'المستند';

  return (
    <div className="space-y-4">
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          → رجوع
        </Button>
        <h1 className="text-[28px] font-bold mt-3.5 mb-1">مراجعة البيانات المستخرجة</h1>
        <p className="text-[var(--mut)] m-0">
          رقم الطلب <span className="ltr">#{id.slice(0, 8).toUpperCase()}</span>
        </p>
      </div>

      {/* Status Banners */}
      {extractedData.status === 'pending_review' && (
        <Alert variant="default">
          <AlertDescription className="font-semibold">
            ◔ تم إرسال هذا الطلب وهو الآن قيد مراجعة الموظف. لا يمكن تعديل البيانات حالياً.
          </AlertDescription>
        </Alert>
      )}

      {extractedData.auto_decision === 'auto_approved' && (
        <Alert variant="success">
          <AlertDescription className="font-semibold">
            ✓ مقبول مبدئياً بالفحص الآلي — القرار النهائي للموظف.
          </AlertDescription>
        </Alert>
      )}

      {extractedData.auto_decision === 'auto_rejected' && (
        <Alert variant="destructive">
          <AlertDescription className="font-semibold">
            ✕ مرفوض مبدئياً بالفحص الآلي — يرجى مراجعة نتائج الفحص أدناه قبل الإرسال.
          </AlertDescription>
        </Alert>
      )}

      {!isReadOnly && hasFailedValidation && (
        <Alert variant="warning">
          <AlertDescription>
            ! يرجى التأكد من الحقول المميّزة بعلامة «تحتاج مراجعة». هذا تنبيه وليس شرطاً للإرسال.
          </AlertDescription>
        </Alert>
      )}

      {/* Document Switcher (if multiple docs) */}
      {documents.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {documents.map((doc) => {
            const docKey = doc.document_id || doc.id;
            const isActive = docKey === (activeDoc?.document_id || activeDoc?.id);
            const label = DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type;
            return (
              <button
                key={docKey}
                type="button"
                onClick={() => {
                  setActiveDocId(docKey);
                  setZoomed(false);
                }}
                className={cn(
                  'min-h-[38px] px-3.5 rounded-[10px] border-[1.5px] text-[14px] font-semibold transition-colors cursor-pointer',
                  isActive
                    ? 'bg-[var(--teal)] border-[var(--teal)] text-white'
                    : 'bg-[var(--card)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--hover-row)]'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Split Content */}
      {activeDoc ? (
        <div className="flex flex-wrap gap-5 items-start">
          {/* Document Image Card */}
          <Card className="p-5 flex-1 basis-[340px]">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <b className="text-[15px]">{activeDocLabel}</b>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setZoomed((z) => !z)}
              >
                {zoomed ? 'تصغير' : 'تكبير'}
              </Button>
            </div>

            {activeImgUrl ? (
              <div
                className="rounded-[12px] border border-[var(--line)] bg-[var(--bg)] overflow-hidden flex items-center justify-center transition-all duration-200"
                style={{ minHeight: zoomed ? 380 : 220 }}
              >
                <img
                  src={activeImgUrl}
                  alt={activeDocLabel}
                  className="w-full object-contain transition-all duration-200"
                  style={{ maxHeight: zoomed ? 520 : 280 }}
                />
              </div>
            ) : (
              <div className="h-[200px] rounded-[12px] border border-[var(--line)] bg-[var(--bg)] flex items-center justify-center text-sm text-[var(--mut)]">
                لا توجد صورة للمعاينة
              </div>
            )}
          </Card>

          {/* Extracted Fields + Validation Checks + Submit */}
          <div className="flex-1 basis-[380px] space-y-4">
            <Card className="p-5">
              <ExtractedDataForm
                requestId={id}
                docExtractedData={activeDoc}
                validationResults={validations}
                onSaved={fetchData}
                isReadOnly={isReadOnly}
              />
            </Card>

            {validations.length > 0 && (
              <Card className="p-5">
                <b className="block text-[15px] mb-2">نتائج الفحص</b>
                <div>
                  {validations.map((v) => (
                    <ValidationBadge key={v.id || v.rule_name} validation={v} />
                  ))}
                </div>
              </Card>
            )}

            {!isReadOnly ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="gold"
                  className="flex-1"
                  onClick={() => setConfirmOpen(true)}
                  disabled={submitting || hookLoading}
                >
                  إرسال للمراجعة
                </Button>
                <Link to={`/requests/${id}/upload`} className="sm:w-auto">
                  <Button type="button" variant="outline" className="w-full">
                    تعديل المستندات
                  </Button>
                </Link>
              </div>
            ) : (
              <Link to={`/requests/${id}`} className="block">
                <Button type="button" className="w-full">
                  متابعة حالة الطلب
                </Button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-sm text-[var(--mut)] mb-3">لا توجد مستندات مستخرجة للعرض.</p>
          <Link to={`/requests/${id}/upload`}>
            <Button variant="outline" size="sm">
              رفع المستندات
            </Button>
          </Link>
        </Card>
      )}

      {/* Submit Confirmation Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => !submitting && setConfirmOpen(false)}
        title="تأكيد الإرسال للمراجعة"
        description="سيراجع الموظف بياناتك ومستنداتك. لن تتمكن من التعديل بعد الإرسال."
      >
        <div className="flex items-center justify-end gap-3 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmOpen(false)}
            disabled={submitting}
          >
            رجوع
          </Button>
          <Button type="button" onClick={handleConfirmSubmit} isLoading={submitting}>
            تأكيد الإرسال
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

export default ReviewDataPage;
