import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useRequests } from '@/hooks/useRequests';
import { useToast } from '@/hooks/useToast';
import type { BankRequest, RequestStatus } from '@/types';
import { getSubTypeInfo, REQUEST_TYPE_LABELS, STATUS_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 10;

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

export const EmployeeDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { getEmployeeRequests, isLoading } = useRequests();
  const { toast } = useToast();

  const [allRequests, setAllRequests] = useState<BankRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subTypeFilter, setSubTypeFilter] = useState<string>('all');
  const [autoFlagOnly, setAutoFlagOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const fetchRequests = useCallback(async () => {
    try {
      const data = await getEmployeeRequests({ status: 'all', limit: 100 });
      setAllRequests(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في تحميل الطلبات';
      toast({ variant: 'destructive', title: 'خطأ في جلب البيانات', description: msg });
    }
  }, [getEmployeeRequests, toast]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) await fetchRequests();
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [fetchRequests]);

  const metrics = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let autoFlagged = 0;

    for (const req of allRequests) {
      if (req.status === 'pending_review') pending++;
      else if (req.status === 'approved') approved++;
      else if (req.status === 'rejected') rejected++;
      if (req.auto_decision === 'auto_rejected') autoFlagged++;
    }

    return { pending, approved, rejected, autoFlagged };
  }, [allRequests]);

  const filteredRequests = useMemo(() => {
    return allRequests.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (subTypeFilter !== 'all' && req.sub_type !== subTypeFilter) return false;
      if (autoFlagOnly && req.auto_decision !== 'auto_rejected') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const shortId = req.id ? req.id.slice(0, 8).toLowerCase() : '';
        const fullId = req.id ? req.id.toLowerCase() : '';
        const name = (req.customer_name || req.customer?.name || '').toLowerCase();
        const email = (req.customer_email || req.customer?.email || '').toLowerCase();
        if (!shortId.includes(q) && !fullId.includes(q) && !name.includes(q) && !email.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [allRequests, statusFilter, subTypeFilter, autoFlagOnly, searchQuery]);

  const totalItems = filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRequests, currentPage]);

  const hasActiveFilters =
    statusFilter !== 'all' || subTypeFilter !== 'all' || autoFlagOnly || searchQuery.trim() !== '';

  const handleKpiClick = (target: 'pending_review' | 'approved' | 'rejected' | 'auto_flagged') => {
    setCurrentPage(1);
    if (target === 'auto_flagged') {
      setAutoFlagOnly((prev) => !prev);
      setStatusFilter('all');
      return;
    }
    setAutoFlagOnly(false);
    setStatusFilter((prev) => (prev === target ? 'all' : target));
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setSubTypeFilter('all');
    setAutoFlagOnly(false);
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-[28px] font-bold m-0">لوحة الموظف</h1>
        <Button type="button" variant="outline" size="sm" onClick={fetchRequests} disabled={isLoading}>
          تحديث
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card
          onClick={() => handleKpiClick('pending_review')}
          className={cn(
            'p-5 cursor-pointer transition-colors',
            statusFilter === 'pending_review' && 'border-2 border-[var(--teal)] bg-[var(--in-bg)]/40'
          )}
        >
          <div className="text-[14px] text-[var(--mut)]">قيد المراجعة</div>
          <div className="text-[34px] font-bold mt-1">
            <span className="ltr">{metrics.pending}</span>
          </div>
        </Card>

        <Card
          onClick={() => handleKpiClick('approved')}
          className={cn(
            'p-5 cursor-pointer transition-colors',
            statusFilter === 'approved' && 'border-2 border-[var(--ok)] bg-[var(--ok-bg)]/40'
          )}
        >
          <div className="text-[14px] text-[var(--mut)]">تمت الموافقة</div>
          <div className="text-[34px] font-bold mt-1">
            <span className="ltr">{metrics.approved}</span>
          </div>
        </Card>

        <Card
          onClick={() => handleKpiClick('rejected')}
          className={cn(
            'p-5 cursor-pointer transition-colors',
            statusFilter === 'rejected' && 'border-2 border-[var(--bad)] bg-[var(--bad-bg)]/40'
          )}
        >
          <div className="text-[14px] text-[var(--mut)]">مرفوضة</div>
          <div className="text-[34px] font-bold mt-1">
            <span className="ltr">{metrics.rejected}</span>
          </div>
        </Card>

        <Card
          onClick={() => handleKpiClick('auto_flagged')}
          className={cn(
            'p-5 cursor-pointer transition-colors',
            autoFlagOnly && 'border-2 border-[var(--warn)] bg-[var(--warn-bg)]/50'
          )}
        >
          <div className="text-[14px] text-[var(--mut)]">مُعلَّمة آلياً</div>
          <div className="text-[34px] font-bold mt-1">
            <span className="ltr">{metrics.autoFlagged}</span>
          </div>
        </Card>
      </div>

      {/* Compact Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-5">
            <Input
              placeholder="بحث باسم العميل، البريد الإلكتروني، أو رقم الطلب..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="lg:col-span-3">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending_review">قيد مراجعة الموظف</SelectItem>
                <SelectItem value="pending_correction">مطلوب مراجعة البيانات</SelectItem>
                <SelectItem value="approved">تمت الموافقة</SelectItem>
                <SelectItem value="rejected">مرفوضة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-3">
            <Select
              value={subTypeFilter}
              onValueChange={(val) => {
                setSubTypeFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="الفئة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفئات</SelectItem>
                <SelectItem value="individual">حساب أفراد</SelectItem>
                <SelectItem value="youth">حساب شباب</SelectItem>
                <SelectItem value="minor">حساب قصّر</SelectItem>
                <SelectItem value="prepaid">بطاقة مسبوقة الدفع</SelectItem>
                <SelectItem value="debit">بطاقة خصم مباشر</SelectItem>
                <SelectItem value="credit">بطاقة ائتمانية</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-1 flex justify-end">
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" onClick={handleClearFilters}>
                مسح
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Requests Table */}
      <Card className="p-2">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>رقم الطلب</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الفحص الآلي</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && paginatedRequests.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="text-center py-12 text-[var(--mut)]">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--teal)] mx-auto mb-2" />
                  جاري تحميل الطلبات...
                </TableCell>
              </TableRow>
            ) : paginatedRequests.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="text-center py-12 text-[var(--mut)]">
                  لا توجد طلبات مطابقة.
                </TableCell>
              </TableRow>
            ) : (
              paginatedRequests.map((req) => {
                const shortId = req.id ? req.id.slice(0, 8).toUpperCase() : '';
                const customerName = req.customer_name || req.customer?.name || 'غير محدد';
                const customerEmail = req.customer_email || req.customer?.email || '-';
                const reqTypeLabel = REQUEST_TYPE_LABELS[req.request_type] || 'فتح حساب بنكي';
                const subTypeInfo = getSubTypeInfo(req.sub_type);
                const statusLabel = STATUS_LABELS[req.status as RequestStatus] || req.status;
                const badgeMeta = getStatusBadgeMeta(req.status as RequestStatus);

                return (
                  <TableRow
                    key={req.id}
                    onClick={() => navigate(`/employee/requests/${req.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <span className="ltr font-semibold">#{shortId}</span>
                    </TableCell>
                    <TableCell>
                      <b>{customerName}</b>
                      <br />
                      <span className="ltr text-[12px] text-[var(--mut)]">{customerEmail}</span>
                    </TableCell>
                    <TableCell>
                      {reqTypeLabel} — {subTypeInfo.badge}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeMeta.variant}>
                        <span>{badgeMeta.icon}</span>
                        <span>{statusLabel}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {req.auto_decision === 'auto_approved' ? (
                        <Badge variant="success">✓ مقبول مبدئياً</Badge>
                      ) : req.auto_decision === 'auto_rejected' ? (
                        <Badge variant="destructive">✕ مرفوض مبدئياً</Badge>
                      ) : (
                        <Badge variant="secondary">◔ قيد التقييم</Badge>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/employee/requests/${req.id}`)}
                      >
                        فتح
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 px-3 py-3 border-t border-[var(--line)] text-[13px] text-[var(--mut)] flex-wrap">
            <span>
              صفحة <b className="ltr">{currentPage}</b> من <b className="ltr">{totalPages}</b> (
              <span className="ltr">{totalItems}</span> طلب)
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                السابق
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export const DashboardPage = EmployeeDashboardPage;
export default EmployeeDashboardPage;
