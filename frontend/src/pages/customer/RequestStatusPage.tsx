import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog } from '@/components/ui/dialog';
import { ValidationBadge } from '@/components/requests/ValidationBadge';
import { useRequests } from '@/hooks/useRequests';
import { useToast } from '@/hooks/useToast';
import type { BankRequest, RequestStatus } from '@/types';
import {
  getSubTypeInfo,
  STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  REQUEST_TYPE_LABELS,
} from '@/lib/constants';
import { resolveImageUrl } from '@/lib/api';

interface TimelineStep {
  step: number;
  label: string;
  status: 'completed' | 'current' | 'upcoming' | 'rejected';
}

function getStatusBadge(status: RequestStatus): {
  variant: 'success' | 'destructive' | 'warning' | 'info';
  icon: string;
} {
  if (status === 'approved') return { variant: 'success', icon: '✓' };
  if (status === 'rejected') return { variant: 'destructive', icon: '✕' };
  if (status === 'pending_upload' || status === 'pending_correction')
    return { variant: 'warning', icon: '!' };
  return { variant: 'info', icon: '◔' };
}

export const RequestStatusPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRequest, deleteRequest, isLoading: hookLoading } = useRequests();
  const { toast } = useToast();

  const [request, setRequest] = useState<BankRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getRequest(id);
      setRequest(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في تحميل تفاصيل الطلب';
      toast({ variant: 'destructive', title: 'خطأ', description: msg });
    } finally {
      setLoading(false);
    }
  }, [id, getRequest, toast]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getRequest(id);
        if (!ignore) setRequest(data);
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'فشل في تحميل تفاصيل الطلب';
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
  }, [id, getRequest, toast]);

  const handleDelete = async () => {
    if (!request) return;
    try {
      setIsDeleting(true);
      await deleteRequest(request.id);
      toast({ variant: 'success', title: 'تم حذف الطلب بنجاح' });
      navigate('/dashboard');
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'خطأ في الحذف',
        description: err instanceof Error ? err.message : 'تعذر حذف الطلب',
      });
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <Card className="py-16 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--teal)] mx-auto mb-2" />
        <p className="text-sm text-[var(--mut)]">جاري تحميل بيانات الطلب...</p>
      </Card>
    );
  }

  if (!request || !id) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-lg font-bold text-[var(--bad)] mb-2">تعذر العثور على الطلب</h2>
        <Link to="/dashboard">
          <Button variant="outline" size="sm">
            الرجوع للوحة التحكم
          </Button>
        </Link>
      </Card>
    );
  }

  const shortId = request.id.slice(0, 8).toUpperCase();
  const subTypeInfo = getSubTypeInfo(request.sub_type);
  const requestTypeLabel = REQUEST_TYPE_LABELS[request.request_type] || 'طلب مصرفي';
  const statusLabel = STATUS_LABELS[request.status] || request.status;
  const badgeMeta = getStatusBadge(request.status);
  const formattedCreated = new Date(request.created_at).toISOString().slice(0, 10);

  const getTimeline = (status: RequestStatus): TimelineStep[] => {
    const s1: TimelineStep['status'] = 'completed';
    let s2: TimelineStep['status'] = 'upcoming';
    let s3: TimelineStep['status'] = 'upcoming';
    let s4: TimelineStep['status'] = 'upcoming';
    let s5: TimelineStep['status'] = 'upcoming';

    if (status === 'pending_upload') {
      s2 = 'current';
    } else if (status === 'processing' || status === 'pending_correction') {
      s2 = 'completed';
      s3 = 'current';
    } else if (status === 'pending_review') {
      s2 = 'completed';
      s3 = 'completed';
      s4 = 'current';
    } else if (status === 'approved') {
      s2 = s3 = s4 = s5 = 'completed';
    } else if (status === 'rejected') {
      s2 = s3 = s4 = 'completed';
      s5 = 'rejected';
    }

    return [
      { step: 1, label: 'تقديم الطلب', status: s1 },
      { step: 2, label: 'رفع المستندات', status: s2 },
      { step: 3, label: 'الفحص الآلي ومراجعة البيانات', status: s3 },
      { step: 4, label: 'مراجعة الموظف', status: s4 },
      { step: 5, label: status === 'rejected' ? 'تم الرفض' : 'القرار النهائي', status: s5 },
    ];
  };

  const timelineSteps = getTimeline(request.status);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            → رجوع
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={fetchDetails} disabled={hookLoading}>
              تحديث
            </Button>
            {request.status !== 'processing' && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={hookLoading || isDeleting}
              >
                حذف الطلب
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap mt-4">
          <div>
            <h1 className="text-[26px] sm:text-[28px] font-bold m-0">
              طلب <span className="ltr">#{shortId}</span> — {requestTypeLabel}
            </h1>
            <p className="text-[var(--mut)] mt-1 mb-0">
              {subTypeInfo.title} · <span className="ltr">{formattedCreated}</span>
            </p>
          </div>
          <Badge variant={badgeMeta.variant}>
            <span>{badgeMeta.icon}</span>
            <span>{statusLabel}</span>
          </Badge>
        </div>
      </div>

      {/* Decision Banners */}
      {request.status === 'approved' && (
        <Alert variant="success">
          <AlertDescription className="font-semibold">
            ✓ تمت الموافقة على طلبك بنجاح.
            {request.verifier_name ? ` (بواسطة ${request.verifier_name})` : ''}
          </AlertDescription>
        </Alert>
      )}

      {request.status === 'rejected' && (
        <Alert variant="destructive">
          <AlertDescription>
            <div className="font-semibold">✕ تم رفض الطلب.</div>
            {request.rejection_reason && (
              <div className="mt-1">سبب الرفض: {request.rejection_reason}</div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {request.status === 'pending_correction' && (
        <Alert variant="warning">
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>! الطلب بانتظار مراجعة البيانات المستخرجة وإرساله للموظف.</span>
            <Link to={`/requests/${request.id}/review`}>
              <Button variant="gold" size="sm">
                مراجعة البيانات
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {request.status === 'pending_upload' && (
        <Alert variant="warning">
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>! يرجى استكمال رفع المستندات المطلوبة لبدء الفحص.</span>
            <Link to={`/requests/${request.id}/upload`}>
              <Button variant="gold" size="sm">
                رفع المستندات
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Timeline */}
      <Card className="p-5">
        <b className="block text-[15px] mb-4">مراحل الطلب</b>
        <div className="space-y-3">
          {timelineSteps.map((s) => (
            <div key={s.step} className="flex items-center justify-between gap-3 py-1.5 border-b border-[var(--line)] last:border-b-0">
              <div className="flex items-center gap-3">
                <span
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${
                    s.status === 'completed'
                      ? 'bg-[var(--ok)] text-white'
                      : s.status === 'current'
                      ? 'bg-[var(--teal)] text-white'
                      : s.status === 'rejected'
                      ? 'bg-[var(--bad)] text-white'
                      : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mut)]'
                  }`}
                >
                  {s.status === 'completed' ? '✓' : s.status === 'rejected' ? '✕' : s.step}
                </span>
                <span className={s.status === 'upcoming' ? 'text-[var(--mut)]' : 'font-semibold text-[var(--ink)]'}>
                  {s.label}
                </span>
              </div>
              {s.status === 'current' && <Badge variant="info">المرحلة الحالية</Badge>}
              {s.status === 'completed' && <Badge variant="success">✓ مكتمل</Badge>}
              {s.status === 'rejected' && <Badge variant="destructive">✕ مرفوض</Badge>}
            </div>
          ))}
        </div>
      </Card>

      {/* Validation Results */}
      {request.validation_results && request.validation_results.length > 0 && (
        <Card className="p-5">
          <b className="block text-[15px] mb-2">نتائج الفحص</b>
          {request.validation_results.map((vr) => (
            <ValidationBadge key={vr.id || vr.rule_name} validation={vr} />
          ))}
        </Card>
      )}

      {/* Documents */}
      {request.documents && request.documents.length > 0 && (
        <Card className="p-5">
          <b className="block text-[15px] mb-3">المستندات المرفقة ({request.documents.length})</b>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {request.documents.map((doc) => {
              const rawUrl = doc.image_url || doc.file_path;
              const imgUrl = rawUrl ? resolveImageUrl(rawUrl) : null;
              const label = DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type;
              return (
                <div
                  key={doc.id}
                  className="rounded-[12px] border border-[var(--line)] bg-[var(--bg)]/60 p-3 space-y-2"
                >
                  <div className="text-[13px] font-semibold text-[var(--ink)]">{label}</div>
                  {imgUrl && (
                    <div
                      onClick={() => setPreviewImage(imgUrl)}
                      className="h-32 rounded-[8px] border border-[var(--line)] bg-white overflow-hidden cursor-pointer"
                    >
                      <img src={imgUrl} alt={label} className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a2827]/65 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] bg-[var(--card)] border border-[var(--line)] rounded-[14px] p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <b>معاينة المستند</b>
              <Button variant="outline" size="sm" onClick={() => setPreviewImage(null)}>
                إغلاق ✕
              </Button>
            </div>
            <div className="overflow-auto mt-3 flex items-center justify-center max-h-[75vh]">
              <img src={previewImage} alt="المستند" className="max-h-[75vh] w-auto rounded-[10px] object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => !isDeleting && setIsDeleteDialogOpen(false)}
        title="تأكيد حذف الطلب"
        description={`سيتم حذف الطلب #${shortId} وكافة المستندات المرفقة به نهائياً.`}
      >
        <div className="flex items-center justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
            إلغاء
          </Button>
          <Button variant="destructive" onClick={handleDelete} isLoading={isDeleting}>
            تأكيد الحذف
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

export default RequestStatusPage;
