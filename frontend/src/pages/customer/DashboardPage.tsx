import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { RequestCard } from '@/components/requests/RequestCard';
import { useRequests } from '@/hooks/useRequests';
import { useToast } from '@/hooks/useToast';
import type { BankRequest } from '@/types';

export const DashboardPage: React.FC = () => {
  const { getMyRequests, deleteRequest, isLoading, error } = useRequests();
  const { toast } = useToast();
  const [requests, setRequests] = useState<BankRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'approved' | 'rejected'>('all');
  const [requestToDelete, setRequestToDelete] = useState<BankRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchRequests = useCallback(async () => {
    try {
      const data = await getMyRequests();
      setRequests(data);
    } catch {
      // Error handled by hook
    }
  }, [getMyRequests]);

  const handleDeleteClick = (_e: React.MouseEvent, req: BankRequest) => {
    setRequestToDelete(req);
  };

  const handleConfirmDelete = async () => {
    if (!requestToDelete) return;
    try {
      setIsDeleting(true);
      await deleteRequest(requestToDelete.id);
      setRequests((prev) => prev.filter((r) => r.id !== requestToDelete.id));
      toast({
        title: 'تم حذف الطلب بنجاح',
        description: `تم حذف الطلب رقم #${requestToDelete.id.slice(0, 8).toUpperCase()} وكافة المستندات المرفقة به.`,
      });
      setRequestToDelete(null);
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'خطأ في عملية الحذف',
        description: err instanceof Error ? err.message : 'تعذر حذف الطلب',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        const data = await getMyRequests();
        if (!ignore) {
          setRequests(data);
        }
      } catch {
        // Handled by hook
      }
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [getMyRequests]);

  const stats = useMemo(() => {
    const total = requests.length;
    const active = requests.filter(
      (r) =>
        r.status === 'pending_upload' ||
        r.status === 'processing' ||
        r.status === 'pending_correction' ||
        r.status === 'pending_review'
    ).length;
    const approved = requests.filter((r) => r.status === 'approved').length;
    const rejected = requests.filter((r) => r.status === 'rejected').length;

    return { total, active, approved, rejected };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Search by short ID or sub_type
      const matchesSearch =
        searchQuery.trim() === '' ||
        req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.sub_type.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'active') {
        return (
          req.status === 'pending_upload' ||
          req.status === 'processing' ||
          req.status === 'pending_correction' ||
          req.status === 'pending_review'
        );
      }
      if (statusFilter === 'approved') {
        return req.status === 'approved';
      }
      if (statusFilter === 'rejected') {
        return req.status === 'rejected';
      }

      return true;
    });
  }, [requests, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">طلبات فتح الحسابات المصرفية</h1>
          <p className="text-sm text-slate-500 mt-1">
            متابعة فورية لحالة طلباتك المصرفية، التحقق الآلي، وقرارات الحسابات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRequests}
            disabled={isLoading}
            className="gap-1.5 text-xs text-slate-600"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>

          <Link to="/requests/new">
            <Button className="gap-2 shadow-xs">
              <PlusCircle className="h-4 w-4" />
              طلب جديد
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">إجمالي الطلبات</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200/80 bg-amber-50/30 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-800">قيد المعالجة والمراجعة</p>
              <h3 className="text-2xl font-bold text-amber-900 mt-1">{stats.active}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/80 bg-emerald-50/30 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-800">حسابات مفعلة ومقبولة</p>
              <h3 className="text-2xl font-bold text-emerald-900 mt-1">{stats.approved}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200/80 bg-rose-50/30 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-rose-800">طلبات مرفوضة</p>
              <h3 className="text-2xl font-bold text-rose-900 mt-1">{stats.rejected}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="بحث برقم الطلب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-3.5 w-3.5 text-slate-400 hidden sm:block shrink-0 ml-1" />
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            className="text-xs h-8"
          >
            الكل ({stats.total})
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('active')}
            className="text-xs h-8"
          >
            قيد الإجراء ({stats.active})
          </Button>
          <Button
            variant={statusFilter === 'approved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('approved')}
            className="text-xs h-8"
          >
            مقبولة ({stats.approved})
          </Button>
          <Button
            variant={statusFilter === 'rejected' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('rejected')}
            className="text-xs h-8"
          >
            مرفوضة ({stats.rejected})
          </Button>
        </div>
      </div>

      {/* Requests List */}
      {isLoading && requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
          <span className="text-sm text-slate-600">جاري تحميل قائمة الطلبات...</span>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm font-semibold text-rose-800">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRequests}
            className="mt-3 text-xs border-rose-300 text-rose-800 hover:bg-rose-100"
          >
            إعادة المحاولة
          </Button>
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
          <CardContent className="text-center py-16">
            <div className="h-14 w-14 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {requests.length === 0
                ? 'لا توجد طلبات فتح حساب مصرفي حتى الآن'
                : 'لا توجد نتائج مطابقة لبحثك'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              {requests.length === 0
                ? 'ابدأ الآن بفتح حسابك البنكي الرقمي مع نايل أوبس خلال دقائق معدودة مع فحص فوري للمستندات.'
                : 'حاول تغيير معايير البحث أو اختيار تبويب تصفية آخر.'}
            </p>
            {requests.length === 0 && (
              <Link to="/requests/new">
                <Button className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  تقديم طلب جديد الآن
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <RequestCard key={req.id} request={req} onDelete={handleDeleteClick} />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!requestToDelete}
        onClose={() => !isDeleting && setRequestToDelete(null)}
        title="تأكيد حذف الطلب"
        description="يرجى الانتباه إلى أن هذا الإجراء نهائي ولا يمكن التراجع عنه."
      >
        <div className="space-y-4 pt-2">
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-900 leading-relaxed">
            هل أنت متأكد من رغبتك في حذف هذا الطلب{' '}
            <strong className="font-mono font-bold">
              #{requestToDelete?.id.slice(0, 8).toUpperCase()}
            </strong>
            ؟ سيتم حذف جميع الملفات والبيانات المسحوبة والمستندات المرتبطة به نهائياً من الخوادم.
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRequestToDelete(null)}
              disabled={isDeleting}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="text-xs gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>جاري الحذف...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>تأكيد الحذف نهائياً</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
