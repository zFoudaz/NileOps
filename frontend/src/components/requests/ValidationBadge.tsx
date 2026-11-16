import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, ShieldAlert, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ValidationResult } from '@/types';
import { RULE_LABELS } from '@/lib/constants';

interface ValidationBadgeProps {
  validation: ValidationResult;
  showDetails?: boolean;
}

export const ValidationBadge: React.FC<ValidationBadgeProps> = ({
  validation,
  showDetails = true,
}) => {
  const ruleMeta = RULE_LABELS[validation.rule_name] || {
    title: validation.rule_name,
    description: 'قاعدة تحقق مالي ومصرفي آلي',
  };

  const getReasonText = (): string | null => {
    if (validation.passed) return null;
    const details = validation.details as Record<string, unknown> | undefined;
    if (!details) return 'لم يتم استيفاء شروط القاعدة الآلية';

    if (typeof details.reason === 'string') return details.reason;
    if (typeof details.error === 'string') return details.error;

    if (validation.rule_name === 'id_expiry') {
      return 'بطاقة الرقم القومي منتهية الصلاحية أو بيانات الانتهاء غير واضحة';
    }
    if (validation.rule_name === 'age_check') {
      return 'عمر صاحب الطلب لا يتطابق مع الفئة العمرية المحددة لنوع الحساب';
    }
    if (validation.rule_name === 'guardian_id_match') {
      return 'الرقم القومي لولي الأمر لا يتطابق مع الرقم المسجل بشهادة الميلاد';
    }
    return 'قيمة الحقل غير مطابقة للشروط المصرفية';
  };

  const reason = getReasonText();

  return (
    <div
      className={`rounded-lg p-3.5 border transition ${
        validation.passed
          ? 'bg-emerald-50/60 border-emerald-200'
          : 'bg-rose-50/60 border-rose-200'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {validation.passed ? (
            <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          ) : (
            <div className="h-7 w-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <XCircle className="h-4 w-4" />
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-slate-900">{ruleMeta.title}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{ruleMeta.description}</p>
          </div>
        </div>

        <Badge
          variant={validation.passed ? 'success' : 'destructive'}
          className="shrink-0 gap-1 text-xs px-2.5 py-0.5"
        >
          {validation.passed ? (
            <>
              <ShieldCheck className="h-3 w-3" />
              مطابق للشروط
            </>
          ) : (
            <>
              <ShieldAlert className="h-3 w-3" />
              غير مطابق
            </>
          )}
        </Badge>
      </div>

      {showDetails && !validation.passed && reason && (
        <div className="mt-2.5 pt-2 border-t border-rose-200/60 text-xs text-rose-800 flex items-start gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-600" />
          <span>{reason}</span>
        </div>
      )}

      {validation.user_corrected && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-700 bg-amber-100/60 rounded px-2 py-0.5 w-fit">
          <Info className="h-3 w-3 shrink-0" />
          <span>تم تعديل بيانات هذا الفحص بواسطة العميل</span>
        </div>
      )}
    </div>
  );
};
