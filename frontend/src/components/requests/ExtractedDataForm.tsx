import React, { useState, useMemo } from 'react';
import { Lock, Save, AlertCircle, CheckCircle2, Loader2, Sparkles, UserCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Document, DocumentExtractedData, ValidationResult } from '@/types';
import { FIELD_LABELS, DOCUMENT_TYPE_LABELS } from '@/lib/constants';
import { decodeEgyptianNationalId } from '@/lib/nationalId';
import { useRequests } from '@/hooks/useRequests';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface ExtractedDataFormProps {
  requestId: string;
  docExtractedData: DocumentExtractedData;
  validationResults?: ValidationResult[];
  onSaved?: (updatedDoc: Document) => void | Promise<void>;
  isReadOnly?: boolean;
}

export const ExtractedDataForm: React.FC<ExtractedDataFormProps> = ({
  requestId,
  docExtractedData,
  validationResults = [],
  onSaved,
  isReadOnly = false,
}) => {
  const { submitCorrection, isLoading } = useRequests();
  const { toast } = useToast();

  const currentMerged = useMemo(() => {
    const values: Record<string, string> = {};
    const merged = {
      ...(docExtractedData.extracted_data || {}),
      ...(docExtractedData.corrected_data || {}),
    };
    if (docExtractedData.fields && docExtractedData.fields.length > 0) {
      for (const f of docExtractedData.fields) {
        values[f.name] = f.value != null ? String(f.value) : '';
      }
    } else {
      for (const [k, v] of Object.entries(merged)) {
        values[k] = v != null ? String(v) : '';
      }
    }
    return values;
  }, [docExtractedData]);

  const docId = docExtractedData.document_id || docExtractedData.id;
  const [prevDocId, setPrevDocId] = useState(docId);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  if (prevDocId !== docId) {
    setPrevDocId(docId);
    setOverrides({});
    setDirtyFields(new Set());
    setSaveSuccess(false);
  }

  const formValues = useMemo(() => {
    return { ...currentMerged, ...overrides };
  }, [currentMerged, overrides]);

  // Decode national ID if present
  const nationalIdVal =
    formValues.national_id || formValues.father_national_id || formValues.child_national_id;
  const decodedId = nationalIdVal ? decodeEgyptianNationalId(nationalIdVal) : null;

  // Identify fields with validation warnings
  const mismatchFields = new Set<string>();
  for (const vr of validationResults) {
    if (!vr.passed) {
      if (vr.rule_name === 'id_expiry') mismatchFields.add('expiry_date');
      if (vr.rule_name === 'age_check') {
        mismatchFields.add('national_id');
        mismatchFields.add('date_of_birth');
        mismatchFields.add('dob');
      }
      if (vr.rule_name === 'guardian_id_match') {
        mismatchFields.add('father_national_id');
        mismatchFields.add('national_id');
      }
    }
  }

  const handleFieldChange = (fieldName: string, value: string) => {
    if (isReadOnly || fieldName.toLowerCase() === 'expiry_date') return;

    setOverrides((prev) => ({ ...prev, [fieldName]: value }));
    setDirtyFields((prev) => {
      const next = new Set(prev);
      if (value !== (currentMerged[fieldName] || '')) {
        next.add(fieldName);
      } else {
        next.delete(fieldName);
      }
      return next;
    });
    setSaveSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dirtyFields.size === 0 || isReadOnly) return;

    // Filter out expiry_date explicitly per Global Constraints
    const correctedPayload: Record<string, string> = {};
    for (const key of dirtyFields) {
      if (key.toLowerCase() !== 'expiry_date') {
        correctedPayload[key] = formValues[key];
      }
    }

    if (Object.keys(correctedPayload).length === 0) return;

    try {
      const updatedDoc = await submitCorrection(
        requestId,
        docExtractedData.document_id || docExtractedData.id,
        correctedPayload
      );
      if (onSaved) {
        await onSaved(updatedDoc);
      }
      setSaveSuccess(true);
      setDirtyFields(new Set());
      setOverrides({});
      toast({
        variant: 'success',
        title: 'تم حفظ التعديلات بنجاح',
        description: 'تم تحديث البيانات المستخرجة للمستند وسيتم اعتمادها في الفحص.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في حفظ التعديلات';
      toast({
        variant: 'destructive',
        title: 'خطأ في الحفظ',
        description: msg,
      });
    }
  };

  const fieldKeys = Object.keys(formValues);

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <h3 className="font-semibold text-slate-800 text-sm">
            البيانات المستخرجة ({DOCUMENT_TYPE_LABELS[docExtractedData.document_type] || docExtractedData.document_type})
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          {fieldKeys.length} حقول مستخرجة
        </span>
      </div>

      {fieldKeys.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          لم يتم استخراج بيانات نصية من هذا المستند بعد.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fieldKeys.map((key) => {
            const isLocked =
              key.toLowerCase() === 'expiry_date' ||
              docExtractedData.editable_flags?.[key] === false ||
              isReadOnly;
            const isMismatch = mismatchFields.has(key);
            const isDirty = dirtyFields.has(key);
            const labelText = FIELD_LABELS[key] || key;

            return (
              <div
                key={key}
                className={cn(
                  'rounded-lg border p-3 transition',
                  isMismatch
                    ? 'border-rose-300 bg-rose-50/30'
                    : isDirty
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200 bg-white'
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor={`field-${key}`} className="text-xs font-semibold text-slate-700">
                    {labelText}
                  </Label>
                  {isLocked && (
                    <Badge variant="outline" className="text-[11px] gap-1 text-slate-500 bg-slate-100 border-slate-300">
                      <Lock className="h-2.5 w-2.5" />
                      مقفل
                    </Badge>
                  )}
                  {isMismatch && (
                    <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                      تنبيه مطابقة
                    </Badge>
                  )}
                </div>

                <div className="relative">
                  <Input
                    id={`field-${key}`}
                    value={formValues[key] || ''}
                    disabled={isLocked || isLoading}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    dir="auto"
                    className={cn(
                      'text-sm font-medium',
                      isLocked && 'bg-slate-100/70 text-slate-600 cursor-not-allowed border-dashed',
                      isMismatch && 'border-rose-400 focus-visible:ring-rose-400',
                      isDirty && 'border-amber-400 focus-visible:ring-amber-400'
                    )}
                  />
                </div>

                {isLocked && key.toLowerCase() === 'expiry_date' && (
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Lock className="h-3 w-3 text-slate-400 shrink-0" />
                    تاريخ انتهاء بطاقة الرقم القومي مقفل ومحمي أمنياً ضد التعديل اليدوي
                  </p>
                )}

                {isMismatch && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-rose-500 shrink-0" />
                    تحقق من صحة هذه القيمة ومطابقتها للشروط المصرفية
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Decoded National ID Info Card */}
      {decodedId && decodedId.isValid && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-2 mb-3 text-emerald-800 font-semibold text-xs">
            <UserCheck className="h-4 w-4" />
            <span>بيانات مستنتجة ومحققة آلياً من الرقم القومي:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-md bg-white p-2.5 border border-emerald-100 shadow-2xs">
              <span className="text-slate-400 block mb-0.5">تاريخ الميلاد</span>
              <span className="font-semibold text-slate-800">{decodedId.dateOfBirth}</span>
            </div>

            <div className="rounded-md bg-white p-2.5 border border-emerald-100 shadow-2xs">
              <span className="text-slate-400 block mb-0.5">العمر المحسوب</span>
              <span className="font-semibold text-slate-800">{decodedId.age} سنة</span>
            </div>

            <div className="rounded-md bg-white p-2.5 border border-emerald-100 shadow-2xs">
              <span className="text-slate-400 block mb-0.5">النوع</span>
              <span className="font-semibold text-slate-800">{decodedId.gender}</span>
            </div>

            <div className="rounded-md bg-white p-2.5 border border-emerald-100 shadow-2xs">
              <span className="text-slate-400 block mb-0.5">محافظة الإقامة</span>
              <span className="font-semibold text-slate-800">{decodedId.governorate}</span>
            </div>
          </div>
        </div>
      )}

      {!isReadOnly && fieldKeys.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="text-xs">
            {saveSuccess && (
              <span className="text-emerald-700 flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                تم حفظ وتحديث التعديلات بنجاح
              </span>
            )}
            {dirtyFields.size > 0 && (
              <span className="text-amber-700 font-medium">
                لديك {dirtyFields.size} تعديلات غير محفوظة
              </span>
            )}
          </div>

          <Button
            type="submit"
            disabled={dirtyFields.size === 0 || isLoading}
            className="gap-2 font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                حفظ التعديلات
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  );
};
