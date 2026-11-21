import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Document, DocumentExtractedData, ValidationResult } from '@/types';
import { FIELD_LABELS } from '@/lib/constants';
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

const LTR_FIELDS = new Set(['national_id', 'father_national_id', 'child_national_id', 'expiry_date', 'date_of_birth', 'dob']);

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

  const nationalIdVal =
    formValues.national_id || formValues.father_national_id || formValues.child_national_id;
  const decodedId = nationalIdVal ? decodeEgyptianNationalId(nationalIdVal) : null;

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

  if (fieldKeys.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-[var(--mut)]">
        {docExtractedData.ocr_required === false
          ? 'هذا المستند للمراجعة البصرية فقط (بدون OCR).'
          : 'لم يتم استخراج بيانات نصية من هذا المستند.'}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {fieldKeys.map((key) => {
        const isExpiry = key.toLowerCase() === 'expiry_date';
        const isLocked =
          isExpiry || docExtractedData.editable_flags?.[key] === false || isReadOnly;
        const isMismatch = mismatchFields.has(key);
        const isDirty = dirtyFields.has(key);
        const isLtr = LTR_FIELDS.has(key.toLowerCase());
        const labelText = (FIELD_LABELS[key] || key).replace(' (غير قابل للتعديل)', '');
        const originalOcr = docExtractedData.extracted_data?.[key];
        const showOcrHint =
          originalOcr !== undefined &&
          originalOcr !== null &&
          (isMismatch || String(originalOcr) !== String(formValues[key] || ''));

        return (
          <div key={key}>
            <Label htmlFor={`field-${docId}-${key}`} className="flex items-center gap-2 flex-wrap">
              <span>{labelText}</span>
              {isLocked && (
                <Badge variant="info" className="text-[12px] py-0.5 px-2">
                  🔒 مقفل
                </Badge>
              )}
              {isMismatch && (
                <Badge variant="warning" className="text-[12px] py-0.5 px-2">
                  ! تحتاج مراجعة
                </Badge>
              )}
            </Label>

            <Input
              id={`field-${docId}-${key}`}
              value={formValues[key] || ''}
              readOnly={isLocked}
              disabled={isLoading}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              dir={isLtr ? 'ltr' : 'auto'}
              className={cn(
                isLtr && 'text-end tracking-wider',
                isLocked && 'bg-[var(--locked-bg)] border-[var(--locked-border)] cursor-not-allowed',
                !isLocked && (isMismatch || isDirty) && 'border-2 border-[var(--warn)] bg-[var(--warn-bg)]'
              )}
            />

            {showOcrHint && (
              <div className="text-[13px] text-[var(--mut)] mt-1">
                القراءة الأصلية (OCR):{' '}
                <span className={isLtr ? 'ltr' : ''}>{String(originalOcr)}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Compact Decoded National ID Strip */}
      {decodedId && decodedId.isValid && (
        <div className="rounded-[12px] border border-[var(--line)] bg-[var(--bg)] p-3 text-[13px]">
          <div className="font-semibold text-[var(--teal)] mb-2">بيانات مستنتجة من الرقم القومي</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-[var(--mut)] block text-[12px]">تاريخ الميلاد</span>
              <b className="ltr">{decodedId.dateOfBirth}</b>
            </div>
            <div>
              <span className="text-[var(--mut)] block text-[12px]">العمر</span>
              <b>{decodedId.age} سنة</b>
            </div>
            <div>
              <span className="text-[var(--mut)] block text-[12px]">النوع</span>
              <b>{decodedId.gender}</b>
            </div>
            <div>
              <span className="text-[var(--mut)] block text-[12px]">المحافظة</span>
              <b>{decodedId.governorate}</b>
            </div>
          </div>
        </div>
      )}

      {!isReadOnly && (dirtyFields.size > 0 || saveSuccess) && (
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--line)] flex-wrap">
          <div className="text-[13px]">
            {dirtyFields.size > 0 ? (
              <span className="text-[var(--warn)] font-semibold">
                لديك {dirtyFields.size} تعديل غير محفوظ
              </span>
            ) : saveSuccess ? (
              <span className="text-[var(--ok)] font-semibold">✓ تم حفظ التعديلات</span>
            ) : null}
          </div>

          {dirtyFields.size > 0 && (
            <Button type="submit" size="sm" isLoading={isLoading}>
              حفظ التعديلات
            </Button>
          )}
        </div>
      )}
    </form>
  );
};
