import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { ValidationBadge } from '@/components/requests/ValidationBadge';
import { useRequests } from '@/hooks/useRequests';
import { useToast } from '@/hooks/useToast';
import type { BankRequest, RequestStatus } from '@/types';
import {
  getSubTypeInfo,
  DOCUMENT_TYPE_LABELS,
  FIELD_LABELS,
  REQUEST_TYPE_LABELS,
  STATUS_LABELS,
} from '@/lib/constants';
import { decodeEgyptianNationalId } from '@/lib/nationalId';

function getStatusBadgeMeta(status: RequestStatus): {
  variant: 'success' | 'destructive' | 'warning' | 'info';
  icon: string;
} {
  if (status === 'approved') return { variant: 'success', icon: '✓' };
  if (status === 'rejected') return { variant: 'destructive', icon: '✕' };
  if (status === 'pending_upload' || status === 'pending_correction')
    return { variant: 'warning', icon: '!' };
  return { variant: 'info', icon: '◔' };
}

const LTR_FIELDS = new Set(['national_id', 'father_national_id', 'child_national_id', 'expiry_date', 'date_of_birth', 'dob']);

export const EmployeeRequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getEmployeeRequestDetail, verifyRequest, isLoading } = useRequests();
  const { toast } = useToast();

  const [request, setRequest] = useState<BankRequest | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string>('');

  const [isApproveOpen, setIsApproveOpen] = useState<boolean>(false);
  const [isRejectOpen, setIsRejectOpen] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [verificationNotes, setVerificationNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setFetchError(null);
      const data = await getEmployeeRequestDetail(id);
      setRequest(data);
      if (data.documents && data.documents.length > 0) {
        setSelectedDocId((prev) => prev || data.documents[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في تحميل تفاصيل الطلب';
      setFetchError(msg);
    }
  }, [id, getEmployeeRequestDetail]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!id) return;
      try {
        setFetchError(null);
        const data = await getEmployeeRequestDetail(id);
        if (!ignore) {
          setRequest(data);
          if (data.documents && data.documents.length > 0) {
            setSelectedDocId((prev) => prev || data.documents[0].id);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'فشل في تحميل تفاصيل الطلب';
          setFetchError(msg);
        }
      }
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [id, getEmployeeRequestDetail]);

  const decodedNationalId = useMemo(() => {
    if (!request?.documents) return null;
    for (const doc of request.documents) {
      const merged = { ...(doc.extracted_data || {}), ...(doc.corrected_data || {}) };
      const rawNid = merged.national_id || merged.father_national_id;
      if (typeof rawNid === 'string' && rawNid.trim()) {
        const decoded = decodeEgyptianNationalId(rawNid);
        if (decoded.isValid) return decoded;
      }
    }
    return null;
  }, [request]);

  const handleApprove = async () => {
    if (!id) return;
    setIsSubmitting(true);
    setConflictWarning(null);
    try {
      await verifyRequest(id, {
        decision: 'approved',
        notes: verificationNotes.trim() || undefined,
      });
      setIsApproveOpen(false);
      toast({ variant: 'success', title: 'تمت الموافقة وسُجّل اسمك' });
      await fetchDetail();
    } catch (err: unknown) {
      const customErr = err as Error & { status?: number };
      if (customErr.status === 409 || customErr.message.includes('already been verified')) {
        setConflictWarning('تم البت في هذا الطلب مسبقاً بواسطة موظف آخر.');
        setIsApproveOpen(false);
        await fetchDetail();
      } else {
        toast({ variant: 'destructive', title: 'خطأ في اعتماد الطلب', description: customErr.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!id || !rejectionReason.trim()) return;
    setIsSubmitting(true);
    setConflictWarning(null);
    try {
      await verifyRequest(id, {
        decision: 'rejected',
        reason: rejectionReason.trim(),
        notes: verificationNotes.trim() || undefined,
      });
      setIsRejectOpen(false);
      toast({ variant: 'success', title: 'تم رفض الطلب' });
      await fetchDetail();
    } catch (err: unknown) {
      const customErr = err as Error & { status?: number };
      if (customErr.status === 409 || customErr.message.includes('already been verified')) {
        setConflictWarning('تم البت في هذا الطلب مسبقاً بواسطة موظف آخر.');
        setIsRejectOpen(false);
        await fetchDetail();
      } else {
        toast({ variant: 'destructive', title: 'خطأ في رفض الطلب', description: customErr.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (fetchError) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="outline" size="sm" onClick={() => navigate('/employee')}>
          → رجوع للقائمة
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading && !request) {
    return (
      <Card className="py-16 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--teal)] mx-auto mb-2" />
        <p className="text-sm text-[var(--mut)]">جاري تحميل بيانات الطلب...</p>
      </Card>
    );
  }

  if (!request) return null;

  const shortId = request.id.slice(0, 8).toUpperCase();
  const customerName = request.customer_name || request.customer?.name || 'غير محدد';
  const customerEmail = request.customer_email || request.customer?.email || '-';
  const subTypeInfo = getSubTypeInfo(request.sub_type);
  const requestTypeLabel = REQUEST_TYPE_LABELS[request.request_type] || 'طلب مصرفي';
  const statusLabel = STATUS_LABELS[request.status as RequestStatus] || request.status;
  const badgeMeta = getStatusBadgeMeta(request.status as RequestStatus);

  const isPendingReview = request.status === 'pending_review';
  const isDecided = request.status === 'approved' || request.status === 'rejected' || !!request.verified_by;
  const verifierName = request.verifier_name || request.verifier?.name || 'موظف البنك';
  const decidedLine =
    (request.status === 'approved'
      ? 'تمت الموافقة'
      : 'تم الرفض' + (request.rejection_reason ? ` — ${request.rejection_reason}` : '')) +
    ` بواسطة ${verifierName}`;

  const docsWithData = (request.documents || []).filter((doc) => {
    const ext = doc.extracted_data || {};
    const cor = doc.corrected_data || {};
    return Object.keys(ext).length > 0 || Object.keys(cor).length > 0;
  });

  return (
    <div className="space-y-4">
      <Button type="button" variant="outline" size="sm" onClick={() => navigate('/employee')}>
        → رجوع للقائمة
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 my-2">
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-bold m-0">
            طلب <span className="ltr">#{shortId}</span> — {requestTypeLabel} ({subTypeInfo.title})
          </h1>
          <p className="text-[var(--mut)] mt-1 mb-0">
            {customerName} · <span className="ltr">{customerEmail}</span>
          </p>
        </div>
        <Badge variant={badgeMeta.variant}>
          <span>{badgeMeta.icon}</span>
          <span>{statusLabel}</span>
        </Badge>
      </div>

      {/* Conflict Warning */}
      {conflictWarning && (
        <Alert variant="warning">
          <AlertDescription>! {conflictWarning}</AlertDescription>
        </Alert>
      )}

      {/* Read-Only Decided Banner */}
      {isDecided && (
        <Card role="status" className="p-4 border-[var(--teal)] text-[14px] font-medium">
          🔒 للقراءة فقط — {decidedLine}
        </Card>
      )}

      {/* Auto-Decision Banner */}
      {request.auto_decision === 'auto_approved' && (
        <Alert variant="success">
          <AlertDescription className="font-semibold">
            ✓ مقبول مبدئياً بالفحص الآلي — القرار النهائي للموظف.
          </AlertDescription>
        </Alert>
      )}
      {request.auto_decision === 'auto_rejected' && (
        <Alert variant="destructive">
          <AlertDescription className="font-semibold">
            ✕ مرفوض مبدئياً بالفحص الآلي — يرجى مراجعة نتائج الفحص والمستندات أدناه.
          </AlertDescription>
        </Alert>
      )}

      {/* Two-Column Split: Documents + Comparison & Checks */}
      <div className="flex flex-wrap gap-5 items-start">
        {/* Documents Column */}
        <div className="flex-1 basis-[340px] min-w-0">
          <DocumentViewer
            documents={request.documents || []}
            selectedDocumentId={selectedDocId}
            onSelectDocument={setSelectedDocId}
          />
        </div>

        {/* Data Comparison & Checks Column */}
        <div className="flex-1 basis-[420px] min-w-0 space-y-4">
          {/* Extracted vs Customer Correction Comparison */}
          <Card className="p-5">
            <b className="block text-[15px] mb-3">البيانات: القراءة الأصلية مقابل تصحيح العميل</b>

            {docsWithData.length === 0 ? (
              <p className="text-sm text-[var(--mut)] m-0">
                لا توجد بيانات نصية مستخرجة لهذا الطلب.
              </p>
            ) : (
              <div className="space-y-5">
                {docsWithData.map((doc) => {
                  const docTitle = DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type;
                  const extracted = (doc.extracted_data || {}) as Record<string, unknown>;
                  const corrected = (doc.corrected_data || {}) as Record<string, unknown>;
                  const keys = Array.from(new Set([...Object.keys(extracted), ...Object.keys(corrected)]));

                  return (
                    <div key={doc.id}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[13px] font-semibold text-[var(--teal)]">{docTitle}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedDocId(doc.id)}
                          className="text-[12px] text-[var(--teal)] underline cursor-pointer bg-transparent border-0"
                        >
                          عرض الصورة
                        </button>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>الحقل</TableHead>
                            <TableHead>OCR</TableHead>
                            <TableHead>العميل</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {keys.map((key) => {
                            const rawOcr = extracted[key];
                            const rawCor = corrected[key];
                            const isExpiry = key.toLowerCase() === 'expiry_date';
                            const ocrStr = rawOcr != null ? String(rawOcr) : '—';
                            const hasCor = rawCor !== undefined && rawCor !== null && String(rawCor) !== ocrStr;
                            const clientStr = hasCor ? String(rawCor) : ocrStr;
                            const isLtr = LTR_FIELDS.has(key.toLowerCase());
                            const label = (FIELD_LABELS[key] || key).replace(' (غير قابل للتعديل)', '');

                            return (
                              <TableRow key={key} className="hover:bg-transparent">
                                <TableCell>
                                  {label} {isExpiry ? '(مقفل)' : ''}
                                </TableCell>
                                <TableCell>
                                  <span className={isLtr ? 'ltr' : ''}>{ocrStr}</span>
                                </TableCell>
                                <TableCell
                                  className={hasCor ? 'bg-[var(--warn-bg)] font-semibold' : ''}
                                >
                                  <span className={isLtr ? 'ltr' : ''}>{clientStr}</span>{' '}
                                  {hasCor ? '≠ عُدّل' : isExpiry ? '🔒' : ''}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Compact Decoded National ID Info */}
            {decodedNationalId && (
              <div className="mt-4 pt-3 border-t border-[var(--line)] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[13px]">
                <div>
                  <span className="text-[var(--mut)] block text-[12px]">العمر</span>
                  <b>{decodedNationalId.age} سنة</b>
                </div>
                <div>
                  <span className="text-[var(--mut)] block text-[12px]">تاريخ الميلاد</span>
                  <b className="ltr">{decodedNationalId.dateOfBirth}</b>
                </div>
                <div>
                  <span className="text-[var(--mut)] block text-[12px]">النوع</span>
                  <b>{decodedNationalId.gender}</b>
                </div>
                <div>
                  <span className="text-[var(--mut)] block text-[12px]">المحافظة</span>
                  <b>{decodedNationalId.governorate}</b>
                </div>
              </div>
            )}
          </Card>

          {/* Validation Checks */}
          <Card className="p-5">
            <b className="block text-[15px] mb-2">نتائج الفحص</b>
            {request.validation_results && request.validation_results.length > 0 ? (
              request.validation_results.map((vr) => (
                <ValidationBadge key={vr.id || vr.rule_name} validation={vr} />
              ))
            ) : (
              <p className="text-sm text-[var(--mut)] m-0">لا توجد نتائج فحص مسجلة.</p>
            )}
          </Card>
        </div>
      </div>

      {/* Sticky Decision Bar */}
      {isPendingReview && (
        <div className="sticky bottom-3 z-20 mt-5 rounded-[14px] border border-[var(--line)] bg-[var(--card)] px-4 py-3.5 flex items-center justify-end gap-3 flex-wrap shadow-[0_-6px_20px_rgba(20,48,47,0.12)]">
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setRejectionReason('');
              setIsRejectOpen(true);
            }}
            disabled={isSubmitting}
          >
            رفض الطلب
          </Button>
          <Button type="button" onClick={() => setIsApproveOpen(true)} disabled={isSubmitting}>
            الموافقة على الطلب
          </Button>
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog
        open={isApproveOpen}
        onClose={() => !isSubmitting && setIsApproveOpen(false)}
        title="تأكيد الموافقة"
        description="سيُسجَّل اسمك ووقت القرار تلقائياً في الطلب."
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="approve-notes">ملاحظات (اختياري)</Label>
            <textarea
              id="approve-notes"
              rows={2}
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              className="w-full min-h-[72px] rounded-[10px] border-[1.5px] border-[var(--input-border)] bg-white p-2.5 text-[14px] text-[var(--ink)]"
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsApproveOpen(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button type="button" onClick={handleApprove} isLoading={isSubmitting}>
              موافقة
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={isRejectOpen}
        onClose={() => !isSubmitting && setIsRejectOpen(false)}
        title="رفض الطلب"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="rs">سبب الرفض (مطلوب)</Label>
            <textarea
              id="rs"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="اكتب سبب الرفض بوضوح..."
              className="w-full min-h-[90px] rounded-[10px] border-[1.5px] border-[var(--input-border)] bg-white p-2.5 text-[14px] text-[var(--ink)]"
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRejectOpen(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isSubmitting}
              isLoading={isSubmitting}
            >
              تأكيد الرفض
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export const RequestDetailPage = EmployeeRequestDetailPage;
export default EmployeeRequestDetailPage;
