import React from 'react';
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
    description: '',
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
    if (validation.rule_name === 'bank_account_check') {
      return 'لا يوجد حساب بنكي مفعل مطابق للرقم القومي';
    }
    return 'قيمة الحقل غير مطابقة للشروط المصرفية';
  };

  const reason = getReasonText();

  return (
    <div className="py-2.5 border-b border-[var(--line)] last:border-b-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[14px] text-[var(--ink)] font-medium">{ruleMeta.title}</span>
        <Badge variant={validation.passed ? 'success' : 'destructive'}>
          <span>{validation.passed ? '✓' : '✕'}</span>
          <span>{validation.passed ? 'ناجح' : 'غير مطابق'}</span>
        </Badge>
      </div>

      {showDetails && !validation.passed && reason && (
        <p className="text-[13px] text-[var(--bad)] mt-1.5 leading-relaxed">{reason}</p>
      )}

      {validation.user_corrected && (
        <p className="text-[12px] text-[var(--warn)] mt-1">
          ! تم تعديل بيانات هذا الفحص بواسطة العميل
        </p>
      )}
    </div>
  );
};
