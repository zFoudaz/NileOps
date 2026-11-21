import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
  Search,
  RotateCw,
  Copy,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Inbox,
  FilterX,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  getSubTypeInfo,
  REQUEST_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_VARIANTS,
} from '@/lib/constants';

const ITEMS_PER_PAGE = 10;

export const EmployeeDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { getEmployeeRequests, isLoading } = useRequests();
  const { toast } = useToast();

  const [allRequests, setAllRequests] = useState<BankRequest[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subTypeFilter, setSubTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Fetch all requests for metrics & local filtering/pagination
  const fetchRequests = useCallback(async () => {
    try {
      const data = await getEmployeeRequests({ status: 'all', limit: 100 });
      setAllRequests(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في تحميل الطلبات';
      toast({
        variant: 'destructive',
        title: 'خطأ في جلب البيانات',
        description: msg,
      });
    }
  }, [getEmployeeRequests, toast]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) {
        await fetchRequests();
      }
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [fetchRequests]);

  // Compute Metrics from all retrieved requests
  const metrics = useMemo(() => {
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    for (const req of allRequests) {
      if (req.status === 'pending_review') {
        pendingCount++;
      } else if (req.status === 'approved') {
        approvedCount++;
      } else if (req.status === 'rejected') {
        rejectedCount++;
      }
    }

    return {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      total: allRequests.length,
    };
  }, [allRequests]);

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return allRequests.filter((req) => {
      // Status filter
      if (statusFilter !== 'all' && req.status !== statusFilter) {
        return false;
      }

      // Sub-type filter
      if (subTypeFilter !== 'all' && req.sub_type !== subTypeFilter) {
        return false;
      }

      // Date range filter
      if (startDate) {
        const reqDate = new Date(req.created_at);
        const start = new Date(startDate);
        if (reqDate < start) return false;
      }

      if (endDate) {
        const reqDate = new Date(req.created_at);
        const end = new Date(endDate + 'T23:59:59');
        if (reqDate > end) return false;
      }

      // Search query (matches name, email, short ID or full ID)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const shortId = req.id ? req.id.slice(0, 8).toLowerCase() : '';
        const fullId = req.id ? req.id.toLowerCase() : '';
        const name = (req.customer_name || req.customer?.name || '').toLowerCase();
        const email = (req.customer_email || req.customer?.email || '').toLowerCase();

        const matches =
          shortId.includes(query) ||
          fullId.includes(query) ||
          name.includes(query) ||
          email.includes(query);

        if (!matches) return false;
      }

      return true;
    });
  }, [allRequests, statusFilter, subTypeFilter, startDate, endDate, searchQuery]);

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleSubTypeFilterChange = (val: string) => {
    setSubTypeFilter(val);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    setCurrentPage(1);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    setCurrentPage(1);
  };

  const handleCardClick = (status: string) => {
    setStatusFilter((prev) => (prev === status ? 'all' : status));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setSubTypeFilter('all');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast({
      variant: 'default',
      title: 'تم النسخ',
      description: `تم نسخ معرف الطلب #${id.slice(0, 8).toUpperCase()}`,
    });
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Pagination calculation
  const totalItems = filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRequests, currentPage]);

  const hasActiveFilters =
    statusFilter !== 'all' ||
    subTypeFilter !== 'all' ||
    searchQuery.trim() !== '' ||
    startDate !== '' ||
    endDate !== '';

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
            لوحة تحكم موظف المراجعة والتدقيق
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مراجعة طلبات فتح الحسابات البنكية، فحص المستندات والتحقق من القواعد المصرفية
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchRequests}
          disabled={isLoading}
          className="gap-2 self-start sm:self-auto border-slate-300 hover:bg-slate-50"
        >
          <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
          <span>تحديث البيانات</span>
        </Button>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Review */}
        <Card
          onClick={() => handleCardClick('pending_review')}
          className={`cursor-pointer transition hover:shadow-md border ${
            statusFilter === 'pending_review'
              ? 'ring-2 ring-amber-500 border-amber-300 bg-amber-50/20'
              : 'border-slate-200 bg-white hover:border-amber-200'
          }`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                طلبات بانتظار التدقيق
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">
                {metrics.pending}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">تتطلب فحص وقرار الموظف</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Approved */}
        <Card
          onClick={() => handleCardClick('approved')}
          className={`cursor-pointer transition hover:shadow-md border ${
            statusFilter === 'approved'
              ? 'ring-2 ring-emerald-500 border-emerald-300 bg-emerald-50/20'
              : 'border-slate-200 bg-white hover:border-emerald-200'
          }`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                طلبات معتمدة
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">
                {metrics.approved}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">تمت الموافقة وتفعيل الحساب</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Rejected */}
        <Card
          onClick={() => handleCardClick('rejected')}
          className={`cursor-pointer transition hover:shadow-md border ${
            statusFilter === 'rejected'
              ? 'ring-2 ring-rose-500 border-rose-300 bg-rose-50/20'
              : 'border-slate-200 bg-white hover:border-rose-200'
          }`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide">
                طلبات مرفوضة
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">
                {metrics.rejected}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">تم رفضها مع ذكر الأسباب</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-rose-100/70 text-rose-600 flex items-center justify-center shrink-0">
              <XCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total */}
        <Card
          onClick={() => handleCardClick('all')}
          className={`cursor-pointer transition hover:shadow-md border ${
            statusFilter === 'all'
              ? 'ring-2 ring-indigo-500 border-indigo-300 bg-indigo-50/20'
              : 'border-slate-200 bg-white hover:border-indigo-200'
          }`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                إجمالي الطلبات
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">
                {metrics.total}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">كافة الحسابات المسجلة</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            {/* Search Input */}
            <div className="lg:col-span-4 relative">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                بحث بالاسم أو المعرف
              </label>
              <div className="relative">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="بحث باسم العميل، البريد، أو رقم الطلب..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pr-9 text-sm"
                />
              </div>
            </div>

            {/* Status Select */}
            <div className="lg:col-span-2">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                حالة الطلب
              </label>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="حالة الطلب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل (جميع الحالات)</SelectItem>
                  <SelectItem value="pending_review">قيد المراجعة والتدقيق</SelectItem>
                  <SelectItem value="pending_correction">قيد تصحيح العميل</SelectItem>
                  <SelectItem value="approved">معتمد ومقبول</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sub-type Select */}
            <div className="lg:col-span-2">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                فئة الطلب
              </label>
              <Select value={subTypeFilter} onValueChange={handleSubTypeFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="فئة الطلب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل (جميع الأنواع)</SelectItem>
                  <SelectItem value="individual">حساب أفراد (21+ سنة)</SelectItem>
                  <SelectItem value="youth">حساب شباب (15-21 سنة)</SelectItem>
                  <SelectItem value="minor">حساب قصّر (تحت 15 سنة)</SelectItem>
                  <SelectItem value="prepaid">بطاقة مسبوقة الدفع</SelectItem>
                  <SelectItem value="debit">بطاقة الخصم المباشر</SelectItem>
                  <SelectItem value="credit">بطاقة ائتمانية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="lg:col-span-2">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                من تاريخ
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                className="text-xs h-10"
                aria-label="من تاريخ"
              />
            </div>

            {/* End Date */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  إلى تاريخ
                </label>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-[10px] text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-0.5"
                  >
                    <FilterX className="h-3 w-3" />
                    <span>مسح</span>
                  </button>
                )}
              </div>
              <Input
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                className="text-xs h-10"
                aria-label="إلى تاريخ"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">معرف الطلب</TableHead>
              <TableHead>اسم العميل</TableHead>
              <TableHead>البريد الإلكتروني</TableHead>
              <TableHead className="w-[120px]">نوع الطلب</TableHead>
              <TableHead className="w-[110px]">نوع الحساب</TableHead>
              <TableHead className="w-[150px]">القرار الآلي</TableHead>
              <TableHead className="w-[130px]">حالة الطلب</TableHead>
              <TableHead className="w-[150px]">تاريخ التقديم</TableHead>
              <TableHead className="w-[130px]">الموظف المراجع</TableHead>
              <TableHead className="w-[110px] text-center">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && paginatedRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                  <RotateCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                  <p className="text-sm">جاري تحميل بيانات الطلبات...</p>
                </TableCell>
              </TableRow>
            ) : paginatedRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Inbox className="h-12 w-12 stroke-1 text-slate-300 mb-3" />
                    <p className="text-base font-semibold text-slate-700">لا توجد طلبات تطابق معايير البحث</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {hasActiveFilters
                        ? 'جرّب تغيير خيارات التصفية أو مسح البحث'
                        : 'لم يتم تقديم أية طلبات حتى الآن'}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearFilters}
                        className="mt-4 text-xs"
                      >
                        إعادة ضبط الفلاتر
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRequests.map((req) => {
                const shortId = req.id ? req.id.slice(0, 8).toUpperCase() : '';
                const customerName = req.customer_name || req.customer?.name || 'غير محدد';
                const customerEmail = req.customer_email || req.customer?.email || '-';

                const subTypeInfo = getSubTypeInfo(req.sub_type);

                const statusLabel = STATUS_LABELS[req.status as RequestStatus] || req.status;
                const statusVariant = STATUS_VARIANTS[req.status as RequestStatus] || 'default';

                const formattedDate = new Date(req.created_at).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

                const verifierName = req.verifier_name || req.verifier?.name || 'لم يُدقق بعد';

                return (
                  <TableRow
                    key={req.id}
                    onClick={() => navigate(`/employee/requests/${req.id}`)}
                    className="cursor-pointer transition-colors hover:bg-slate-50/80 group"
                  >
                    {/* Request ID */}
                    <TableCell className="font-mono font-medium text-slate-900 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">#{shortId}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyId(e, req.id)}
                          title="نسخ المعرف الكامل"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 rounded text-slate-500"
                        >
                          {copiedId === req.id ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </TableCell>

                    {/* Customer Name */}
                    <TableCell className="font-semibold text-slate-800">
                      {customerName}
                    </TableCell>

                    {/* Customer Email */}
                    <TableCell className="text-slate-500 text-xs dir-ltr text-right">
                      {customerEmail}
                    </TableCell>

                    {/* Request Type */}
                    <TableCell>
                      <Badge variant="outline" className="text-xs bg-emerald-50/60 text-emerald-800 border-emerald-200">
                        {REQUEST_TYPE_LABELS[req.request_type] || 'فتح حساب بنكي'}
                      </Badge>
                    </TableCell>

                    {/* Account Type */}
                    <TableCell>
                      <Badge variant="outline" className="text-xs bg-slate-50 font-normal border-slate-300">
                        {subTypeInfo.badge}
                      </Badge>
                    </TableCell>

                    {/* Auto-Decision */}
                    <TableCell>
                      {req.auto_decision === 'auto_approved' ? (
                        <Badge variant="success" className="gap-1 text-[11px] font-medium py-0.5">
                          <ShieldCheck className="h-3 w-3" />
                          فحص آلي مطابق
                        </Badge>
                      ) : req.auto_decision === 'auto_rejected' ? (
                        <Badge variant="destructive" className="gap-1 text-[11px] font-medium py-0.5">
                          <ShieldAlert className="h-3 w-3" />
                          فحص آلي مرفوض
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px] font-medium text-slate-600 bg-slate-100">
                          قيد التقييم
                        </Badge>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant={statusVariant} className="text-xs font-medium py-0.5 px-2">
                        {statusLabel}
                      </Badge>
                    </TableCell>

                    {/* Created Date */}
                    <TableCell className="text-xs text-slate-500">
                      {formattedDate}
                    </TableCell>

                    {/* Verifier */}
                    <TableCell className="text-xs text-slate-600">
                      {req.verified_by ? (
                        <span className="font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                          {verifierName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">لم يُدقق بعد</span>
                      )}
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/employee/requests/${req.id}`)}
                        className="h-8 px-2.5 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 gap-1 font-semibold"
                      >
                        <span>مراجعة</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-600">
            <div>
              عرض{' '}
              <span className="font-bold text-slate-800">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>{' '}
              إلى{' '}
              <span className="font-bold text-slate-800">
                {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}
              </span>{' '}
              من إجمالي <span className="font-bold text-slate-800">{totalItems}</span> طلب
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5 text-xs gap-1"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                <span>السابق</span>
              </Button>

              <span className="px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md">
                صفحة {currentPage} من {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2.5 text-xs gap-1"
              >
                <span>التالي</span>
                <ChevronLeft className="h-3.5 w-3.5" />
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
