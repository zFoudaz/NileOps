import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronLeft, ShieldCheck, ShieldAlert, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BankRequest, RequestStatus } from '@/types';
import { ACCOUNT_TYPES_INFO, STATUS_LABELS, STATUS_VARIANTS } from '@/lib/constants';

interface RequestCardProps {
  request: BankRequest;
  onClick?: () => void;
}

export const RequestCard: React.FC<RequestCardProps> = ({ request, onClick }) => {
  const navigate = useNavigate();

  const shortId = request.id ? request.id.slice(0, 8).toUpperCase() : '';
  const accountInfo =
    ACCOUNT_TYPES_INFO[request.sub_type as keyof typeof ACCOUNT_TYPES_INFO] || {
      title: request.sub_type,
      badge: request.sub_type,
    };

  const statusLabel = STATUS_LABELS[request.status] || request.status;
  const statusVariant = STATUS_VARIANTS[request.status] || 'default';

  const formattedDate = new Date(request.created_at).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getTargetRoute = (status: RequestStatus, id: string): string => {
    switch (status) {
      case 'pending_upload':
        return `/requests/${id}/upload`;
      case 'pending_correction':
      case 'processing':
        return `/requests/${id}/review`;
      default:
        return `/requests/${id}`;
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(getTargetRoute(request.status, request.id));
    }
  };

  return (
    <Card
      onClick={handleClick}
      className="group cursor-pointer transition duration-200 hover:shadow-md hover:border-emerald-300 border-slate-200 bg-white"
    >
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-mono font-bold text-xs shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-slate-800">
                  #{shortId}
                </span>
                <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                  {accountInfo.badge}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{accountInfo.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Badge variant={statusVariant} className="text-xs font-medium py-1 px-2.5">
              {statusLabel}
            </Badge>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-1">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>تاريخ التقديم: {formattedDate}</span>
          </div>

          <div className="flex items-center gap-3">
            {request.auto_decision === 'auto_approved' && (
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                فحص آلي مطابق
              </span>
            )}
            {request.auto_decision === 'auto_rejected' && (
              <span className="flex items-center gap-1 text-rose-700 font-medium">
                <ShieldAlert className="h-3.5 w-3.5" />
                فحص آلي مرفوض
              </span>
            )}

            <div className="flex items-center gap-1 text-emerald-700 font-semibold group-hover:translate-x-[-2px] transition-transform">
              <span>عرض التفاصيل</span>
              <ChevronLeft className="h-4 w-4" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
