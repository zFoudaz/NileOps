import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BankRequest, RequestStatus } from '@/types';
import { getSubTypeInfo, REQUEST_TYPE_LABELS, STATUS_LABELS } from '@/lib/constants';

interface RequestCardProps {
  request: BankRequest;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent, request: BankRequest) => void;
}

function getStatusMeta(status: RequestStatus): {
  variant: 'success' | 'destructive' | 'warning' | 'info';
  icon: string;
  nextStep: string;
  cta: string;
  targetPath: (id: string) => string;
} {
  switch (status) {
    case 'pending_upload':
      return {
        variant: 'warning',
        icon: '!',
        nextStep: 'ارفع المستندات المطلوبة',
        cta: 'رفع المستندات',
        targetPath: (id) => `/requests/${id}/upload`,
      };
    case 'processing':
      return {
        variant: 'info',
        icon: '◔',
        nextStep: 'جاري الفحص الآلي للمستندات',
        cta: 'متابعة المعالجة',
        targetPath: (id) => `/requests/${id}/upload`,
      };
    case 'pending_correction':
      return {
        variant: 'warning',
        icon: '!',
        nextStep: 'راجع بياناتك',
        cta: 'مراجعة البيانات',
        targetPath: (id) => `/requests/${id}/review`,
      };
    case 'pending_review':
      return {
        variant: 'info',
        icon: '◔',
        nextStep: 'بانتظار الموظف',
        cta: 'تتبّع الطلب',
        targetPath: (id) => `/requests/${id}`,
      };
    case 'approved':
      return {
        variant: 'success',
        icon: '✓',
        nextStep: 'لا يوجد',
        cta: 'عرض التفاصيل',
        targetPath: (id) => `/requests/${id}`,
      };
    case 'rejected':
      return {
        variant: 'destructive',
        icon: '✕',
        nextStep: 'راجع سبب الرفض',
        cta: 'عرض التفاصيل',
        targetPath: (id) => `/requests/${id}`,
      };
    default:
      return {
        variant: 'info',
        icon: '◔',
        nextStep: 'متابعة الطلب',
        cta: 'عرض التفاصيل',
        targetPath: (id) => `/requests/${id}`,
      };
  }
}

export const RequestCard: React.FC<RequestCardProps> = ({ request, onClick, onDelete }) => {
  const navigate = useNavigate();

  const shortId = request.id ? request.id.slice(0, 8).toUpperCase() : '';
  const subTypeInfo = getSubTypeInfo(request.sub_type);
  const requestTypeLabel = REQUEST_TYPE_LABELS[request.request_type] || 'فتح حساب بنكي';
  const statusLabel = STATUS_LABELS[request.status] || request.status;
  const meta = getStatusMeta(request.status);

  const formattedDate = new Date(request.created_at).toISOString().slice(0, 10);

  const handleOpen = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(meta.targetPath(request.id));
    }
  };

  return (
    <Card className="p-5 flex flex-col justify-between gap-3">
      <div>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <b className="text-[16px] text-[var(--ink)]">{requestTypeLabel}</b>
          <Badge variant={meta.variant}>
            <span>{meta.icon}</span>
            <span>{statusLabel}</span>
          </Badge>
        </div>

        <p className="text-[14px] text-[var(--mut)] my-2">
          {subTypeInfo.title} · <span className="ltr">{formattedDate}</span> ·{' '}
          <span className="ltr">#{shortId}</span>
        </p>

        <p className="text-[14px] text-[var(--ink)]">
          الخطوة التالية: <b>{meta.nextStep}</b>
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={handleOpen}>
          {meta.cta}
        </Button>

        {onDelete && request.status !== 'processing' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e, request);
            }}
            title="حذف الطلب"
            aria-label="حذف الطلب"
            className="p-2 rounded-[8px] text-[var(--mut)] hover:text-[var(--bad)] hover:bg-[var(--bad-bg)] transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </Card>
  );
};
