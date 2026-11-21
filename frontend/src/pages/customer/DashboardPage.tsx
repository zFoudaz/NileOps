import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { RequestCard } from '@/components/requests/RequestCard';
import { useRequests } from '@/hooks/useRequests';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { getSubTypeInfo } from '@/lib/constants';
import type { BankAccount, BankRequest } from '@/types';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { getMyRequests, getMyAccounts, deleteRequest, isLoading, error } = useRequests();
  const { toast } = useToast();
  const [requests, setRequests] = useState<BankRequest[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [requestToDelete, setRequestToDelete] = useState<BankRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchRequests = useCallback(async () => {
    try {
      const [reqData, accData] = await Promise.all([getMyRequests(), getMyAccounts()]);
      setRequests(reqData);
      setAccounts(accData);
    } catch {
      // Handled by hook
    }
  }, [getMyRequests, getMyAccounts]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        const [reqData, accData] = await Promise.all([getMyRequests(), getMyAccounts()]);
        if (!ignore) {
          setRequests(reqData);
          setAccounts(accData);
        }
      } catch {
        // Handled by hook
      }
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [getMyRequests, getMyAccounts]);

  const handleConfirmDelete = async () => {
    if (!requestToDelete) return;
    try {
      setIsDeleting(true);
      await deleteRequest(requestToDelete.id);
      setRequests((prev) => prev.filter((r) => r.id !== requestToDelete.id));
      toast({
        variant: 'success',
        title: 'تم حذف الطلب بنجاح',
      });
      setRequestToDelete(null);
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'خطأ في الحذف',
        description: err instanceof Error ? err.message : 'تعذر حذف الطلب',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'عميلنا العزيز';

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-bold text-[var(--ink)] m-0">
            أهلاً بك يا {firstName} 👋
          </h1>
          <p className="text-[var(--mut)] mt-1.5 mb-0">
            تابع طلباتك أو ابدأ طلباً جديداً.
          </p>
        </div>

        <Link to="/requests/new">
          <Button variant="gold">+ طلب جديد</Button>
        </Link>
      </div>

      {/* Active Bank Accounts (only shown if user has activated accounts) */}
      {accounts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[16px] font-bold text-[var(--ink)]">حساباتي البنكية المفعلة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => {
              const typeMeta = getSubTypeInfo(acc.account_type);
              return (
                <Card key={acc.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <b className="text-[15px]">{typeMeta.title}</b>
                      <Badge variant="success">✓ مفعل</Badge>
                    </div>
                    <div className="ltr text-[15px] font-bold text-[var(--teal)] tracking-wider">
                      {acc.account_number}
                    </div>
                    <div className="text-[13px] text-[var(--mut)] mt-0.5">
                      {acc.holder_name}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Requests Grid */}
      {isLoading && requests.length === 0 ? (
        <Card className="py-16 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--teal)] mx-auto mb-2" />
          <p className="text-sm text-[var(--mut)]">جاري تحميل طلباتك...</p>
        </Card>
      ) : error ? (
        <Card className="p-6 text-center border-[var(--bad)] bg-[var(--bad-bg)]">
          <p className="text-sm font-semibold text-[var(--bad)] mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchRequests}>
            إعادة المحاولة
          </Button>
        </Card>
      ) : requests.length === 0 ? (
        <Card className="py-14 px-6 text-center">
          <h3 className="text-[18px] font-bold text-[var(--ink)] mb-1.5">لا توجد طلبات حتى الآن</h3>
          <p className="text-[14px] text-[var(--mut)] max-w-md mx-auto mb-5">
            قدّم طلب فتح حساب بنكي أو إصدار بطاقة في دقائق، وتابع كل مرحلة بوضوح.
          </p>
          <Link to="/requests/new">
            <Button variant="gold">+ تقديم طلب جديد</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              onDelete={(_e, r) => setRequestToDelete(r)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!requestToDelete}
        onClose={() => !isDeleting && setRequestToDelete(null)}
        title="تأكيد حذف الطلب"
        description={`سيتم حذف الطلب #${requestToDelete?.id.slice(0, 8).toUpperCase() || ''} وجميع المستندات المرتبطة به نهائياً.`}
      >
        <div className="flex items-center justify-end gap-3 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setRequestToDelete(null)}
            disabled={isDeleting}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmDelete}
            isLoading={isDeleting}
          >
            تأكيد الحذف
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
