import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRequests } from '@/hooks/useRequests';
import { useToast } from '@/hooks/useToast';
import type { BankAccount, RequestType } from '@/types';
import { DOCUMENT_TYPE_LABELS, REQUEST_TYPES_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';

export const NewRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { createRequest, getMyAccounts, isLoading } = useRequests();
  const { toast } = useToast();

  const requestTypeList = Object.values(REQUEST_TYPES_CONFIG);
  const initialRequestType: RequestType = requestTypeList[0].key;
  const initialSubType = Object.keys(REQUEST_TYPES_CONFIG[initialRequestType].subTypes)[0];

  const [selectedRequestType, setSelectedRequestType] = useState<RequestType>(initialRequestType);
  const [selectedSubType, setSelectedSubType] = useState<string>(initialSubType);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState<boolean>(false);

  useEffect(() => {
    let ignore = false;
    const loadAccounts = async () => {
      const data = await getMyAccounts();
      if (!ignore) {
        setAccounts(data.filter((a) => a.status === 'active'));
        setAccountsLoaded(true);
      }
    };
    void loadAccounts();
    return () => {
      ignore = true;
    };
  }, [getMyAccounts]);

  const hasActiveAccount = accounts.length > 0;
  const activeConfig = REQUEST_TYPES_CONFIG[selectedRequestType];
  const subTypeList = Object.values(activeConfig.subTypes);
  const selectedSubConfig = activeConfig.subTypes[selectedSubType];
  const missingBankAccount = Boolean(
    accountsLoaded && selectedSubConfig?.requiresBankAccount && !hasActiveAccount
  );

  const handleSelectRequestType = (reqType: RequestType) => {
    setSelectedRequestType(reqType);
    const firstSub = Object.keys(REQUEST_TYPES_CONFIG[reqType].subTypes)[0];
    if (firstSub) {
      setSelectedSubType(firstSub);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newReq = await createRequest(selectedRequestType, selectedSubType);
      toast({
        variant: 'success',
        title: 'تم إنشاء الطلب بنجاح',
      });
      navigate(`/requests/${newReq.id}/upload`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في إنشاء الطلب';
      toast({
        variant: 'destructive',
        title: 'لا يمكن إنشاء الطلب',
        description: msg,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          → رجوع
        </Button>
        <h1 className="text-[28px] font-bold mt-3.5 mb-1">طلب جديد</h1>
        <p className="text-[var(--mut)] m-0">اختر نوع الخدمة والفئة المناسبة لبدء رفع المستندات.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Service Type */}
        <div className="space-y-3">
          <div className="text-[14px] font-semibold text-[var(--teal)]">1. نوع الخدمة</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {requestTypeList.map((cfg) => {
              const isSelected = selectedRequestType === cfg.key;
              return (
                <Card
                  key={cfg.key}
                  onClick={() => handleSelectRequestType(cfg.key)}
                  className={cn(
                    'p-5 cursor-pointer transition-colors border-2',
                    isSelected
                      ? 'border-[var(--teal)] bg-[var(--in-bg)]/45'
                      : 'border-[var(--line)] hover:border-[var(--teal)]/50'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <b className="text-[16px]">{cfg.shortTitle}</b>
                    {isSelected && <Badge variant="info">✓ مختار</Badge>}
                  </div>
                  <p className="text-[13px] text-[var(--mut)] mt-1.5 mb-0">{cfg.description}</p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Step 2: Sub-type */}
        <div className="space-y-3">
          <div className="text-[14px] font-semibold text-[var(--teal)]">2. الفئة</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subTypeList.map((info) => {
              const isSelected = selectedSubType === info.key;
              const needsAccountWarning = Boolean(
                accountsLoaded && info.requiresBankAccount && !hasActiveAccount
              );

              return (
                <Card
                  key={info.key}
                  onClick={() => setSelectedSubType(info.key)}
                  className={cn(
                    'p-5 cursor-pointer transition-colors border-2 flex flex-col justify-between gap-4',
                    isSelected
                      ? needsAccountWarning
                        ? 'border-[var(--warn)] bg-[var(--warn-bg)]/40'
                        : 'border-[var(--teal)] bg-[var(--in-bg)]/35'
                      : 'border-[var(--line)] hover:border-[var(--teal)]/50'
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                      <b className="text-[16px]">{info.title}</b>
                      {info.ageRange && <Badge variant="outline">{info.ageRange}</Badge>}
                    </div>

                    {info.requiresBankAccount && accountsLoaded && (
                      <div className="mb-2">
                        {hasActiveAccount ? (
                          <Badge variant="success">✓ حسابك البنكي مفعل</Badge>
                        ) : (
                          <Badge variant="warning">! يتطلب حساب بنكي مفعل</Badge>
                        )}
                      </div>
                    )}

                    <p className="text-[13px] text-[var(--mut)] leading-relaxed m-0">
                      {info.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--line)]">
                    <div className="text-[13px] font-semibold mb-1.5">
                      المستندات المطلوبة ({info.requiredDocs.length}):
                    </div>
                    <ul className="space-y-1 text-[13px] text-[var(--mut)] list-disc list-inside m-0 p-0">
                      {info.requiredDocs.map((docType) => (
                        <li key={docType}>{DOCUMENT_TYPE_LABELS[docType] || docType}</li>
                      ))}
                    </ul>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Missing Bank Account Alert */}
        {missingBankAccount && (
          <Alert variant="warning">
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span>
                ! لإصدار بطاقة الخصم المباشر، يجب أن يكون لديك حساب بنكي مفعل أولاً.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSelectRequestType('account_opening')}
              >
                فتح حساب بنكي أولاً
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2 flex-wrap">
          <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
            إلغاء
          </Button>
          <Button type="submit" variant="gold" isLoading={isLoading}>
            متابعة ورفع المستندات
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewRequestPage;
