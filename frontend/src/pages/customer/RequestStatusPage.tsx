import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Eye,
  RefreshCw,
  Edit3,
  Upload,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ValidationBadge } from '@/components/requests/ValidationBadge';
import { useRequests } from '@/hooks/useRequests';
import { useToast } from '@/hooks/useToast';
import type { BankRequest, RequestStatus } from '@/types';
import {
  ACCOUNT_TYPES_INFO,
  STATUS_LABELS,
  STATUS_VARIANTS,
  DOCUMENT_TYPE_LABELS,
} from '@/lib/constants';

interface TimelineStep {
  step: number;
  label: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming' | 'rejected';
}

export const RequestStatusPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getRequest, isLoading: hookLoading } = useRequests();
  const { toast } = useToast();

  const [request, setRequest] = useState<BankRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getRequest(id);
      setRequest(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في تحميل تفاصيل الطلب';
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: msg,
      });
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
        if (!ignore) {
          setRequest(data);
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
          setLoading(false);
        }
      }
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [id, getRequest, toast]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
        <span className="text-sm font-medium text-slate-600">جاري تحميل بيانات الطلب...</span>
      </div>
    );
  }

  if (!request || !id) {
    return (
      <div className="max-w-2xl mx-auto rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-rose-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-rose-900">تعذر العثور على الطلب</h2>
        <p className="text-xs text-rose-700 mt-1 mb-4">
          الطلب غير متاح أو ليس لديك صلاحية للوصول إليه.
        </p>
        <Link to="/dashboard">
          <Button variant="outline" size="sm">
            الرجوع إلى لوحة التحكم
          </Button>
        </Link>
      </div>
    );
  }

  const shortId = request.id ? request.id.slice(0, 8).toUpperCase() : '';
  const accountInfo =
    ACCOUNT_TYPES_INFO[request.sub_type as keyof typeof ACCOUNT_TYPES_INFO] || {
      title: request.sub_type,
      badge: request.sub_type,
    };
  const statusLabel = STATUS_LABELS[request.status] || request.status;
  const statusVariant = STATUS_VARIANTS[request.status] || 'default';

  const formattedCreated = new Date(request.created_at).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedUpdated = new Date(request.updated_at).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate timeline steps
  const getTimeline = (status: RequestStatus): TimelineStep[] => {
    const isRejected = status === 'rejected';
    const isApproved = status === 'approved';

    let s1: TimelineStep['status'] = 'completed';
    let s2: TimelineStep['status'] = 'upcoming';
    let s3: TimelineStep['status'] = 'upcoming';
    let s4: TimelineStep['status'] = 'upcoming';
    let s5: TimelineStep['status'] = 'upcoming';

    if (status === 'pending_upload') {
      s2 = 'current';
    } else if (status === 'processing') {
      s2 = 'completed';
      s3 = 'current';
    } else if (status === 'pending_correction') {
      s2 = 'completed';
      s3 = 'current';
    } else if (status === 'pending_review') {
      s2 = 'completed';
      s3 = 'completed';
      s4 = 'current';
    } else if (isApproved) {
      s1 = 'completed';
      s2 = 'completed';
      s3 = 'completed';
      s4 = 'completed';
      s5 = 'completed';
    } else if (isRejected) {
      s1 = 'completed';
      s2 = 'completed';
      s3 = 'completed';
      s4 = 'completed';
      s5 = 'rejected';
    }

    return [
      {
        step: 1,
        label: 'تقديم الطلب',
        description: 'تم تسجيل الطلب وتحديد نوع الحساب',
        status: s1,
      },
      {
        step: 2,
        label: 'رفع المستندات',
        description: 'رفع الصور الثبوتية المطلوبة',
        status: s2,
      },
      {
        step: 3,
        label: 'الفحص والتحقق الآلي',
        description: 'قراءة النصوص OCR ومطابقة القواعد',
        status: s3,
      },
      {
        step: 4,
        label: 'مراجعة الموظف المختص',
        description: 'تدقيق المستندات والبيانات يدوياً',
        status: s4,
      },
      {
        step: 5,
        label: 'القرار النهائي وتفعيل الحساب',
        description: isRejected ? 'تم رفض الطلب' : 'تفعيل الحساب البنكي',
        status: s5,
      },
    ];
  };

  const timelineSteps = getTimeline(request.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              #{shortId}
            </span>
            <Badge variant="outline" className="text-xs">
              {accountInfo.title}
            </Badge>
            <Badge variant={statusVariant} className="text-xs">
              {statusLabel}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">متابعة تفاصيل وحالة الطلب</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تاريخ التقديم: {formattedCreated} • آخر تحديث: {formattedUpdated}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDetails}
            disabled={hookLoading}
            className="gap-1.5 text-xs text-slate-600"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${hookLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-600">
              الرجوع للوحة التحكم
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Decision Alerts */}
      {request.status === 'approved' && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-5 shadow-xs flex items-start gap-4">
          <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-emerald-950">
                تهانينا! تم قبول طلبك وتفعيل الحساب المصرفي
              </h3>
              <Badge variant="success" className="text-xs">
                معتمد
              </Badge>
            </div>
            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
              تمت مراجعة جميع المستندات والموافقة عليها بنجاح من قبل فريق العمليات المصرفية. يمكنك الآن استخدام حسابك والتمتع بكافة الخدمات البنكية.
            </p>
            {request.verified_at && (
              <p className="text-[11px] text-emerald-700 mt-2 font-medium">
                تم الاعتماد بتاريخ:{' '}
                {new Date(request.verified_at).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
      )}

      {request.status === 'rejected' && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50/90 p-5 shadow-xs flex items-start gap-4">
          <div className="h-11 w-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <XCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-rose-950">
                تم رفض طلب فتح الحساب
              </h3>
              <Badge variant="destructive" className="text-xs">
                مرفوض
              </Badge>
            </div>
            {request.rejection_reason ? (
              <div className="mt-2 p-3 rounded-lg bg-white/70 border border-rose-200 text-xs text-rose-900">
                <span className="font-semibold block mb-0.5">سبب الرفض:</span>
                <span>{request.rejection_reason}</span>
              </div>
            ) : (
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                لم يستوفِ الطلب الشروط المصرفية المحددة أو تبين عدم مطابقة المستندات.
              </p>
            )}
            <div className="mt-3">
              <Link to="/requests/new">
                <Button size="sm" variant="outline" className="text-xs border-rose-300 text-rose-800 hover:bg-rose-100">
                  تقديم طلب حساب جديد
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {request.status === 'pending_correction' && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-5 shadow-xs flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                الطلب بانتظار مراجعة وتصحيح البيانات
              </h3>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                يرجى الانتقال لصفحة مراجعة البيانات للتحقق من الحقول المستخرجة وتعديل الأخطاء إن وجدت ثم إرسالها للمراجعة.
              </p>
            </div>
          </div>
          <Link to={`/requests/${request.id}/review`}>
            <Button size="sm" className="gap-1.5 text-xs shrink-0">
              <Edit3 className="h-3.5 w-3.5" />
              مراجعة البيانات
            </Button>
          </Link>
        </div>
      )}

      {/* Progress Timeline Stepper */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-6">
          <h3 className="font-bold text-slate-900 text-base mb-6">مراحل سير الطلب</h3>

          <div className="relative">
            <div className="space-y-6">
              {timelineSteps.map((step, idx) => {
                const isLast = idx === timelineSteps.length - 1;

                return (
                  <div key={step.step} className="relative flex items-start gap-4">
                    {/* Vertical connecting line */}
                    {!isLast && (
                      <div
                        className={`absolute right-4.5 top-9 w-0.5 -bottom-6 ${
                          step.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                    )}

                    {/* Step Icon */}
                    <div
                      className={`relative z-10 h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition ${
                        step.status === 'completed'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : step.status === 'current'
                          ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500'
                          : step.status === 'rejected'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {step.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : step.status === 'rejected' ? (
                        <XCircle className="h-5 w-5" />
                      ) : step.status === 'current' ? (
                        <Clock className="h-4 w-4 animate-spin text-emerald-700" />
                      ) : (
                        step.step
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 pt-1 pb-2">
                      <div className="flex items-center justify-between">
                        <h4
                          className={`text-sm font-bold ${
                            step.status === 'completed'
                              ? 'text-slate-900'
                              : step.status === 'current'
                              ? 'text-emerald-800'
                              : step.status === 'rejected'
                              ? 'text-rose-800'
                              : 'text-slate-500'
                          }`}
                        >
                          {step.label}
                        </h4>

                        {step.status === 'completed' && (
                          <Badge variant="success" className="text-[11px] py-0 px-2">
                            مكتمل
                          </Badge>
                        )}
                        {step.status === 'current' && (
                          <Badge variant="outline" className="text-[11px] py-0 px-2 text-emerald-700 border-emerald-300 bg-emerald-50">
                            المرحلة الحالية
                          </Badge>
                        )}
                        {step.status === 'rejected' && (
                          <Badge variant="destructive" className="text-[11px] py-0 px-2">
                            مرفوض
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results Badges */}
      {request.validation_results && request.validation_results.length > 0 && (
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">نتائج الفحص والتحقق الآلي</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {request.validation_results.map((vr) => (
                <ValidationBadge key={vr.id || vr.rule_name} validation={vr} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Documents Thumbnails */}
      {request.documents && request.documents.length > 0 && (
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">المستندات المرفقة بالطلب ({request.documents.length})</h3>
              {request.status === 'pending_upload' && (
                <Link to={`/requests/${request.id}/upload`}>
                  <Button size="sm" variant="outline" className="text-xs gap-1">
                    <Upload className="h-3.5 w-3.5" />
                    استكمال الرفع
                  </Button>
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {request.documents.map((doc) => {
                const imgUrl = doc.image_url
                  ? doc.image_url.startsWith('http')
                    ? doc.image_url
                    : `http://localhost:8000${doc.image_url.startsWith('/') ? '' : '/'}${doc.image_url}`
                  : null;

                return (
                  <div
                    key={doc.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                        </span>
                        {doc.ocr_completed ? (
                          <Badge variant="success" className="text-[10px] py-0 px-1.5">
                            OCR مكتمل
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-slate-500">
                            مرفوع
                          </Badge>
                        )}
                      </div>

                      {imgUrl ? (
                        <div
                          className="relative h-28 w-full rounded-lg bg-slate-100 border border-slate-200 overflow-hidden cursor-pointer group"
                          onClick={() => setPreviewImage(imgUrl)}
                        >
                          <img
                            src={imgUrl}
                            alt={doc.document_type}
                            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1">
                            <Eye className="h-4 w-4" />
                            <span>معاينة</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-28 w-full rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                          <FileText className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>مسار الملف:</span>
                      <span className="font-mono text-slate-500 truncate max-w-[120px]">
                        {doc.file_path}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        <Link to="/dashboard">
          <Button variant="outline" size="sm">
            الرجوع إلى قائمة الطلبات
          </Button>
        </Link>

        {(request.status === 'pending_correction' || request.status === 'processing') && (
          <Link to={`/requests/${request.id}/review`}>
            <Button size="sm" className="gap-1.5 text-xs">
              <Edit3 className="h-3.5 w-3.5" />
              مراجعة وتعديل البيانات
            </Button>
          </Link>
        )}

        {request.status === 'pending_upload' && (
          <Link to={`/requests/${request.id}/upload`}>
            <Button size="sm" className="gap-1.5 text-xs">
              <Upload className="h-3.5 w-3.5" />
              رفع المستندات المطلوبة
            </Button>
          </Link>
        )}
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
              <h4 className="font-semibold text-slate-900">معاينة المستند المرفق</h4>
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
                alt="المستند"
                className="max-h-[75vh] w-auto rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestStatusPage;
