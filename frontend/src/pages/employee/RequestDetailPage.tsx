import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  User,
  Mail,
  Calendar,
  Lock,
  FileText,
  RotateCw,
  CheckCircle2,
  XCircle,
  FileSearch,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Dialog } from '@/components/ui/dialog';
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
  STATUS_VARIANTS,
} from '@/lib/constants';
import { decodeEgyptianNationalId } from '@/lib/nationalId';

export const EmployeeRequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getEmployeeRequestDetail, verifyRequest, isLoading } = useRequests();
  const { toast } = useToast();

  const [request, setRequest] = useState<BankRequest | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Selected document for inspection
  const [selectedDocId, setSelectedDocId] = useState<string>('');

  // Dialog states
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

  // Decode Egyptian National ID from documents if available
  const decodedNationalId = useMemo(() => {
    if (!request || !request.documents) return null;
    for (const doc of request.documents) {
      const merged = {
        ...(doc.extracted_data || {}),
        ...(doc.corrected_data || {}),
      };
      const rawNid = merged.national_id || merged.father_national_id;
      if (typeof rawNid === 'string' && rawNid.trim()) {
        const decoded = decodeEgyptianNationalId(rawNid);
        if (decoded.isValid) {
          return decoded;
        }
      }
    }
    return null;
  }, [request]);

  // Approve Handler
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
      toast({
        variant: 'success',
        title: 'تم اعتماد وقبول الطلب بنجاح',
        description: 'تم تحديث حالة الطلب إلى معتمد وتوثيق اسم المراجع وتاريخ التدقيق.',
      });
      await fetchDetail();
      setTimeout(() => navigate('/employee'), 1200);
    } catch (err: unknown) {
      const customErr = err as Error & { status?: number };
      if (customErr.status === 409 || customErr.message.includes('already been verified')) {
        setConflictWarning(
          'تنبيه: تم البت في هذا الطلب وتدقيقه مسبقاً بواسطة موظف آخر، ولا يمكن تكرار التدقيق.'
        );
        setIsApproveOpen(false);
        await fetchDetail();
      } else {
        toast({
          variant: 'destructive',
          title: 'خطأ في اعتماد الطلب',
          description: customErr.message,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reject Handler
  const handleReject = async () => {
    if (!id) return;
    if (!rejectionReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'سبب الرفض إلزامي',
        description: 'يرجى كتابة سبب رفض الطلب بوضوح لإبلاغ العميل به.',
      });
      return;
    }

    setIsSubmitting(true);
    setConflictWarning(null);
    try {
      await verifyRequest(id, {
        decision: 'rejected',
        reason: rejectionReason.trim(),
        notes: verificationNotes.trim() || undefined,
      });
      setIsRejectOpen(false);
      toast({
        variant: 'success',
        title: 'تم تسجيل قرار رفض الطلب',
        description: 'تم تسجيل الرفض وحفظ الأسباب المصرفية بنجاح.',
      });
      await fetchDetail();
      setTimeout(() => navigate('/employee'), 1200);
    } catch (err: unknown) {
      const customErr = err as Error & { status?: number };
      if (customErr.status === 409 || customErr.message.includes('already been verified')) {
        setConflictWarning(
          'تنبيه: تم البت في هذا الطلب مسبقاً بواسطة موظف آخر، ولا يمكن تعديل قراره.'
        );
        setIsRejectOpen(false);
        await fetchDetail();
      } else {
        toast({
          variant: 'destructive',
          title: 'خطأ في رفض الطلب',
          description: customErr.message,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (fetchError) {
    return (
      <div className="space-y-6" dir="rtl">
        <Button
          variant="ghost"
          onClick={() => navigate('/employee')}
          className="gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة لقائمة الطلبات</span>
        </Button>

        <Alert variant="destructive">
          <AlertTitle>تعذر فتح تفاصيل الطلب</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading && !request) {
    return (
      <div className="py-24 text-center text-slate-500" dir="rtl">
        <RotateCw className="h-8 w-8 animate-spin mx-auto text-emerald-600 mb-3" />
        <p className="text-base font-medium">جاري تحميل بيانات وتدقيق الطلب...</p>
      </div>
    );
  }

  if (!request) return null;

  const shortId = request.id ? request.id.slice(0, 8).toUpperCase() : '';
  const customerName = request.customer_name || request.customer?.name || 'غير محدد';
  const customerEmail = request.customer_email || request.customer?.email || '-';

  const subTypeInfo = getSubTypeInfo(request.sub_type);
  const requestTypeLabel = REQUEST_TYPE_LABELS[request.request_type] || 'طلب مصرفي';

  const statusLabel = STATUS_LABELS[request.status as RequestStatus] || request.status;
  const statusVariant = STATUS_VARIANTS[request.status as RequestStatus] || 'default';

  const formattedCreatedDate = new Date(request.created_at).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedVerifiedDate = request.verified_at
    ? new Date(request.verified_at).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const isPendingReview = request.status === 'pending_review';
  const isAlreadyVerified =
    request.status === 'approved' || request.status === 'rejected' || !!request.verified_by;

  return (
    <div className="space-y-6 pb-16" dir="rtl">
      {/* Conflict Warning */}
      {conflictWarning && (
        <Alert variant="warning" className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <AlertTitle>طلب تم البت فيه بالفعل</AlertTitle>
          <AlertDescription>{conflictWarning}</AlertDescription>
        </Alert>
      )}

      {/* Header & Back Button */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/employee')}
            className="gap-2 text-slate-600 hover:text-slate-900 -mr-2"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة للوحة تحكم الموظف</span>
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">حالة الطلب:</span>
            <Badge variant={statusVariant} className="text-xs font-semibold py-1 px-3">
              {statusLabel}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                طلب {requestTypeLabel} #{shortId}
              </h1>
              <Badge variant="outline" className="text-xs bg-slate-50 border-slate-300">
                {subTypeInfo.badge}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">{customerName}</span>
              </span>
              <span className="flex items-center gap-1 dir-ltr">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>{customerEmail}</span>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>تاريخ التقديم: {formattedCreatedDate}</span>
              </span>
            </div>
          </div>

          {/* Quick Status Stamp if already verified */}
          {isAlreadyVerified && (
            <div
              className={`rounded-xl p-3 border text-right max-w-sm ${
                request.status === 'approved'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                {request.status === 'approved' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>معتمد ومدقق رسمياً</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-rose-600" />
                    <span>مرفوض بقرار الموظف</span>
                  </>
                )}
              </div>
              <p className="text-[11px] mt-1 text-slate-600">
                بواسطة: <span className="font-semibold">{request.verifier_name || request.verifier?.name || 'موظف البنك'}</span>
                {formattedVerifiedDate && ` بتاريخ ${formattedVerifiedDate}`}
              </p>
            </div>
          )}
        </div>

        {/* Auto Decision Banner */}
        {request.auto_decision === 'auto_approved' && (
          <Alert variant="success" className="bg-emerald-50/80 border-emerald-200 mt-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <AlertTitle className="text-emerald-900 font-bold">
              مطابق مبدئياً بالفحص الآلي (Auto-Approved)
            </AlertTitle>
            <AlertDescription className="text-emerald-800 text-xs">
              اجتازت المستندات والبيانات كافة قواعد التحقق الآلي وصلاحية الهوية بنجاح، بانتظار الاعتماد النهائي من الموظف.
            </AlertDescription>
          </Alert>
        )}

        {request.auto_decision === 'auto_rejected' && (
          <Alert variant="destructive" className="bg-rose-50/80 border-rose-200 mt-2">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
            <AlertTitle className="text-rose-900 font-bold">
              مرفوض مبدئياً بالفحص الآلي (Auto-Rejected)
            </AlertTitle>
            <AlertDescription className="text-rose-800 text-xs">
              أظهر الفحص الآلي عدم مطابقة في بعض الشروط المصرفية (مثل انتهاء الصلاحية أو عدم تطابق السن). يرجى مراجعة نتائج الفحص أدناه.
            </AlertDescription>
          </Alert>
        )}

        {/* If Rejected Banner with Reason */}
        {request.status === 'rejected' && request.rejection_reason && (
          <div className="rounded-xl p-4 bg-rose-100/70 border border-rose-300 text-rose-950 mt-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <XCircle className="h-4 w-4 text-rose-700" />
              <span>سبب الرفض المصرفي المسجل:</span>
            </div>
            <p className="text-xs text-rose-900 mt-1.5 leading-relaxed font-medium">
              {request.rejection_reason}
            </p>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column 1 (Left in RTL): Structured Verification Data */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Customer & Account Details Card */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-600" />
                بيانات صاحب الطلب والحساب
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-1">اسم العميل</span>
                  <span className="font-bold text-slate-800 text-sm">{customerName}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-1">البريد الإلكتروني</span>
                  <span className="font-medium text-slate-700 dir-ltr block truncate">{customerEmail}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block mb-1">فئة الطلب المطلوب</span>
                  <span className="font-bold text-emerald-800">{subTypeInfo.title}</span>
                </div>
              </div>

              {/* Decoded National ID Widget */}
              {decodedNationalId && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      البيانات المستخرجة والمشتقة من الرقم القومي المصري
                    </span>
                    <Badge variant="success" className="text-[10px] py-0 px-1.5">
                      14 رقم مطابق
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      <span className="text-[11px] text-slate-500 block">العمر المحسوب:</span>
                      <span className="font-bold text-slate-900">{decodedNationalId.age} سنة</span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      <span className="text-[11px] text-slate-500 block">تاريخ الميلاد:</span>
                      <span className="font-semibold text-slate-900">{decodedNationalId.dateOfBirth}</span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      <span className="text-[11px] text-slate-500 block">النوع:</span>
                      <span className="font-semibold text-slate-900">{decodedNationalId.gender}</span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      <span className="text-[11px] text-slate-500 block">محافظة الميلاد:</span>
                      <span className="font-semibold text-slate-900 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {decodedNationalId.governorate}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Auto-Decision & Business Rules Summary */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  قواعد العمل والفحص المصرفي الآلي
                </CardTitle>
                <span className="text-xs text-slate-400">
                  {request.validation_results?.length || 0} قواعد مطبقة
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-2.5">
              {request.validation_results && request.validation_results.length > 0 ? (
                request.validation_results.map((vr) => (
                  <ValidationBadge key={vr.id || vr.rule_name} validation={vr} showDetails={true} />
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  لا توجد قواعد تحقق مسجلة لهذا الطلب حتى الآن.
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Extracted vs Corrected Fields Comparison */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSearch className="h-4 w-4 text-emerald-600" />
                  مقارنة البيانات المستخرجة (OCR) وتعديلات العميل
                </CardTitle>
                <span className="text-xs text-slate-400">
                  {request.documents?.length || 0} مستندات
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              {request.documents && request.documents.length > 0 ? (
                request.documents.map((doc) => {
                  const docTitle = DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type;
                  const extracted = (doc.extracted_data || {}) as Record<string, unknown>;
                  const corrected = (doc.corrected_data || {}) as Record<string, unknown>;

                  // Combine unique keys
                  const allKeys = Array.from(
                    new Set([...Object.keys(extracted), ...Object.keys(corrected)])
                  );

                  return (
                    <div
                      key={doc.id}
                      className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs"
                    >
                      {/* Document Header */}
                      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-emerald-600" />
                          <span className="font-bold text-xs text-slate-800">{docTitle}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDocId(doc.id)}
                          className="h-7 text-[11px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-2"
                        >
                          عرض صورة المستند
                        </Button>
                      </div>

                      {/* Fields Table */}
                      {allKeys.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          لم يتم استخراج بيانات نصية من هذا المستند بعد.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 text-xs">
                          {/* Table Header */}
                          <div className="grid grid-cols-12 bg-slate-100/60 font-semibold text-slate-600 p-2.5">
                            <div className="col-span-4">الحقل</div>
                            <div className="col-span-4">القيمة المستخرجة (OCR)</div>
                            <div className="col-span-4">القيمة المعتمدة / تعديل العميل</div>
                          </div>

                          {allKeys.map((key) => {
                            const rawExtracted = extracted[key];
                            const rawCorrected = corrected[key];
                            const isCorrected = rawCorrected !== undefined && rawCorrected !== null;
                            const isExpiryDate = key.toLowerCase() === 'expiry_date';
                            const label = FIELD_LABELS[key] || key;

                            const extractedDisplay =
                              rawExtracted !== undefined && rawExtracted !== null
                                ? String(rawExtracted)
                                : '—';
                            const correctedDisplay = isCorrected ? String(rawCorrected) : null;

                            return (
                              <div
                                key={key}
                                className={`grid grid-cols-12 items-center p-2.5 transition ${
                                  isCorrected
                                    ? 'bg-amber-50/40 hover:bg-amber-50/70'
                                    : 'hover:bg-slate-50/50'
                                }`}
                              >
                                {/* Field Label */}
                                <div className="col-span-4 flex items-center gap-1.5 font-medium text-slate-700">
                                  <span>{label}</span>
                                  {isExpiryDate && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] gap-0.5 text-slate-500 bg-slate-100 border-slate-300 py-0 px-1"
                                      title="حقل تاريخ الانتهاء غير قابل للتعديل وفقاً للضوابط الأمنية"
                                    >
                                      <Lock className="h-2.5 w-2.5" />
                                      محمي
                                    </Badge>
                                  )}
                                </div>

                                {/* OCR Value */}
                                <div className="col-span-4 font-mono text-slate-800 text-xs break-all">
                                  {extractedDisplay}
                                </div>

                                {/* Corrected Value or status */}
                                <div className="col-span-4">
                                  {isCorrected ? (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded break-all">
                                        {correctedDisplay}
                                      </span>
                                      <Badge
                                        variant="warning"
                                        className="text-[10px] py-0 px-1 font-normal"
                                      >
                                        معدل من العميل
                                      </Badge>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic">
                                      مطابق للقراءة الآلية
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  لا توجد مستندات مرفوعة لهذا الطلب.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Column 2 (Right in RTL): Document Inspection Viewer */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  فحص المستندات الأصلية
                </CardTitle>
                <span className="text-xs text-slate-500">تكبير، تدوير، ومطابقة البيانات</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DocumentViewer
                documents={request.documents || []}
                selectedDocumentId={selectedDocId}
                onSelectDocument={setSelectedDocId}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Bar (Fixed or Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Status info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">حالة الطلب:</span>
              <Badge variant={statusVariant} className="text-xs py-1 px-3">
                {statusLabel}
              </Badge>
            </div>
            {request.verified_by && (
              <span className="text-xs text-slate-600">
                الموظف المعتمد:{' '}
                <strong className="text-slate-900">{request.verifier_name || request.verifier?.name}</strong>
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isPendingReview ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setIsRejectOpen(true)}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial gap-2 px-5 bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <XCircle className="h-4 w-4" />
                  <span>رفض الطلب</span>
                </Button>

                <Button
                  variant="default"
                  onClick={() => setIsApproveOpen(true)}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial gap-2 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>اعتماد وقبول الطلب</span>
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">
                  تم الانتهاء من فحص وتدقيق هذا الطلب
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/employee')}
                  className="text-xs"
                >
                  العودة للوحة التحكم
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approve Confirmation Dialog */}
      <Dialog
        open={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        title={`اعتماد وقبول طلب ${requestTypeLabel}`}
        description="يرجى تأكيد قرار قبول الطلب بعد التحقق من مطابقة وصلاحية كافة المستندات والبيانات."
      >
        <div className="space-y-4 pt-2">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 leading-relaxed">
            سيتم اعتماد الطلب ونقل حالته إلى <strong className="font-bold">معتمد (Approved)</strong>،
            كما سيتم توثيق اسمك وتاريخ وساعة الاعتماد بالسجل الرقابي.
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              ملاحظات الموظف الرقابية (اختياري)
            </label>
            <textarea
              rows={3}
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="أي ملاحظات تخص مطابقة المستندات أو الاستثناءات..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsApproveOpen(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleApprove}
              disabled={isSubmitting}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  <span>جاري الاعتماد...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>تأكيد الاعتماد والقبول</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog
        open={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title="رفض طلب فتح الحساب المصرفي"
        description="يرجى توضيح سبب الرفض المصرفي بدقة ليتم إرساله للعميل وتوثيقه بالنظام."
      >
        <div className="space-y-4 pt-2">
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-900 leading-relaxed">
            سيتم نقل حالة الطلب إلى <strong className="font-bold">مرفوض (Rejected)</strong>،
            ولن يتمكن العميل من فتح الحساب عبر هذا الطلب.
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 block">
              سبب الرفض <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="مثال: صورة بطاقة الرقم القومي منتهية الصلاحية / المستند غير واضح المعالم..."
              className="w-full rounded-lg border border-rose-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-rose-50/20"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              ملاحظات تدقيق داخلية (اختياري)
            </label>
            <textarea
              rows={2}
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="ملاحظات للاستخدام الداخلي فقط..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRejectOpen(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={isSubmitting || !rejectionReason.trim()}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  <span>جاري تسجيل الرفض...</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  <span>تأكيد رفض الطلب</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export const RequestDetailPage = EmployeeRequestDetailPage;
export default EmployeeRequestDetailPage;
