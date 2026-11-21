import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  Baby,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  Loader2,
  HelpCircle,
  Building2,
  Layers,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRequests } from '@/hooks/useRequests';
import { useToast } from '@/hooks/useToast';
import type { RequestType } from '@/types';
import { DOCUMENT_TYPE_LABELS, REQUEST_TYPES_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';

const SUB_TYPE_VISUALS: Record<string, { icon: React.ReactNode; lightBg: string }> = {
  individual: {
    icon: <Users className="h-6 w-6 text-emerald-600" />,
    lightBg: 'bg-emerald-50',
  },
  youth: {
    icon: <GraduationCap className="h-6 w-6 text-blue-600" />,
    lightBg: 'bg-blue-50',
  },
  minor: {
    icon: <Baby className="h-6 w-6 text-purple-600" />,
    lightBg: 'bg-purple-50',
  },
};

const DEFAULT_SUB_TYPE_VISUAL = {
  icon: <Layers className="h-6 w-6 text-slate-600" />,
  lightBg: 'bg-slate-100',
};

export const NewRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { createRequest, isLoading } = useRequests();
  const { toast } = useToast();

  const requestTypeList = Object.values(REQUEST_TYPES_CONFIG);
  const initialRequestType: RequestType = requestTypeList[0].key;
  const initialSubType = Object.keys(REQUEST_TYPES_CONFIG[initialRequestType].subTypes)[0];

  const [selectedRequestType, setSelectedRequestType] = useState<RequestType>(initialRequestType);
  const [selectedSubType, setSelectedSubType] = useState<string>(initialSubType);

  const activeConfig = REQUEST_TYPES_CONFIG[selectedRequestType];
  const subTypeList = Object.values(activeConfig.subTypes);

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
        description: `تم تسجيل طلب (${activeConfig.shortTitle})، يرجى استكمال رفع المستندات المطلوبة.`,
      });
      navigate(`/requests/${newReq.id}/upload`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في إنشاء الطلب';
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: msg,
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb / Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">تقديم طلب مصرفي جديد</h1>
          <p className="text-sm text-slate-500 mt-1">{activeConfig.description}</p>
        </div>
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-600">
            الرجوع للوحة التحكم
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Request Type */}
        <div className={cn(requestTypeList.length > 1 ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : '')}>
          {requestTypeList.map((cfg) => {
            const isSelected = selectedRequestType === cfg.key;
            return (
              <Card
                key={cfg.key}
                onClick={() => requestTypeList.length > 1 && handleSelectRequestType(cfg.key)}
                className={cn(
                  'bg-white transition-all',
                  requestTypeList.length > 1 && 'cursor-pointer',
                  isSelected ? 'border-emerald-600 ring-1 ring-emerald-500/20' : 'border-slate-200'
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-emerald-700 block">
                        الخطوة الأولى: الخدمة المطلوبة
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">{cfg.title}</h3>
                    </div>
                    <Badge variant="success" className="text-xs">
                      متاح ومفعل
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Step 2: Sub-type selection */}
        <div>
          <div className="mb-4">
            <span className="text-xs font-semibold text-emerald-700 block">
              الخطوة الثانية: اختيار فئة الطلب
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">حدد الفئة المناسبة لطلبك</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subTypeList.map((info) => {
              const isSelected = selectedSubType === info.key;
              const visual = SUB_TYPE_VISUALS[info.key] || DEFAULT_SUB_TYPE_VISUAL;

              return (
                <div
                  key={info.key}
                  onClick={() => setSelectedSubType(info.key)}
                  className={cn(
                    'relative rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between bg-white select-none',
                    isSelected
                      ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-4 left-4 h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  )}

                  <div>
                    <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center mb-4', visual.lightBg)}>
                      {visual.icon}
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-slate-900">{info.title}</h3>
                      {info.ageRange && (
                        <Badge variant="outline" className="text-[11px] bg-slate-50 border-slate-200 font-normal">
                          {info.ageRange}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed min-h-[48px]">
                      {info.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-700 block mb-2">
                      المستندات المطلوبة ({info.requiredDocs.length}):
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {info.requiredDocs.map((docType) => (
                        <li key={docType} className="flex items-start gap-1.5">
                          <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{DOCUMENT_TYPE_LABELS[docType] || docType}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Banner */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <p className="font-semibold text-slate-800">تنويه هام بشأن التحقق الآلي والامتثال المصرفي:</p>
            <p className="mt-0.5">
              سيتم فحص المستندات بواسطة نماذج الذكاء الاصطناعي وOCR فور رفعها للتحقق من سريان الرقم القومي، ومطابقة الشروط لنوع الطلب، ثم مراجعتها من قبل موظف البنك المختص للموافقة النهائية.
            </p>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-2">
          <Link to="/dashboard">
            <Button type="button" variant="outline">
              إلغاء
            </Button>
          </Link>

          <Button type="submit" disabled={isLoading} className="gap-2 px-6">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري إنشاء الطلب...
              </>
            ) : (
              <>
                <span>متابعة ورفع المستندات</span>
                <ArrowLeft className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewRequestPage;
