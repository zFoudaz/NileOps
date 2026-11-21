import React, { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { Document, DocumentType } from '@/types';
import { cn } from '@/lib/utils';
import { resolveImageUrl } from '@/lib/api';

interface FileUploadProps {
  documentType: DocumentType;
  label: string;
  description?: string;
  existingDoc?: Document | null;
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif'];

export const FileUpload: React.FC<FileUploadProps> = ({
  documentType: _documentType,
  label,
  description,
  existingDoc,
  onUpload,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|bmp|gif)$/i)) {
      return 'نوع الملف غير مدعوم. يرجى رفع صورة بصيغة (JPG, PNG, WebP).';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return 'حجم الصورة كبير جداً. الحد الأقصى 10 ميجابايت.';
    }
    return null;
  };

  const handleFileProcess = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    setUploadProgress(20);

    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    const preview = URL.createObjectURL(file);
    setLocalPreviewUrl(preview);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 150);

    try {
      await onUpload(file);
      setUploadProgress(100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء رفع الملف';
      setErrorMessage(msg);
      URL.revokeObjectURL(preview);
      setLocalPreviewUrl(null);
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled || isUploading) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFileProcess(e.target.files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const isUploaded = Boolean(existingDoc || (localPreviewUrl && !errorMessage && !isUploading));
  const existingImageUrl = existingDoc
    ? resolveImageUrl(existingDoc.image_url || existingDoc.file_path)
    : null;
  const previewImage = localPreviewUrl || existingImageUrl;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <b className="text-[15px] text-[var(--ink)]">{label}</b>
            {isUploaded ? (
              <Badge variant="success">✓ تم الرفع</Badge>
            ) : (
              <Badge variant="warning">! مطلوب</Badge>
            )}
          </div>
          {description && (
            <p className="text-[13px] text-[var(--mut)] mt-1 leading-relaxed">{description}</p>
          )}
        </div>

        {isUploaded && previewImage && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(true)}>
            معاينة
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {isUploaded && previewImage ? (
        <div className="flex flex-col sm:flex-row items-center gap-4 p-3 rounded-[12px] border border-[var(--line)] bg-[var(--bg)]">
          <div
            className="h-20 w-32 shrink-0 cursor-pointer overflow-hidden rounded-[8px] border border-[var(--line)] bg-white"
            onClick={() => setShowModal(true)}
          >
            <img src={previewImage} alt={label} className="h-full w-full object-cover" />
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-right">
            <p className="text-[14px] font-semibold text-[var(--ok)]">تم حفظ المستند بنجاح</p>
            <p className="text-[12px] text-[var(--mut)] mt-0.5 truncate ltr">
              {existingDoc?.file_path || 'تم رفع الملف وجاهز للفحص'}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBrowseClick}
            disabled={disabled || isUploading}
            isLoading={isUploading}
          >
            استبدال الصورة
          </Button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          className={cn(
            'flex flex-col items-center justify-center rounded-[12px] border-2 border-dashed p-6 text-center transition cursor-pointer select-none',
            isDragging
              ? 'border-[var(--teal)] bg-[var(--in-bg)]'
              : 'border-[var(--line)] bg-[var(--bg)]/50 hover:border-[var(--teal)]',
            (disabled || isUploading) && 'pointer-events-none opacity-60'
          )}
        >
          {isUploading ? (
            <div className="w-full max-w-xs space-y-2 py-2">
              <Loader2 className="h-7 w-7 animate-spin mx-auto text-[var(--teal)]" />
              <p className="text-[13px] font-semibold text-[var(--ink)]">
                جاري الرفع ({uploadProgress}%)...
              </p>
              <div className="h-2 w-full bg-[var(--line)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--teal)] transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-[var(--teal)] mb-2" />
              <p className="text-[14px] font-medium text-[var(--ink)]">
                اسحب صورة المستند هنا أو{' '}
                <span className="text-[var(--teal)] font-bold underline">تصفح جهازك</span>
              </p>
              <p className="text-[12px] text-[var(--mut)] mt-1">
                JPG, PNG, WebP — بحد أقصى 10 ميجابايت
              </p>
            </>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 rounded-[10px] border-[1.5px] border-[var(--bad)] bg-[var(--bad-bg)] px-3 py-2 text-[13px] text-[var(--bad)]">
          ✕ {errorMessage}
        </div>
      )}

      {showModal && previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a2827]/65 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] bg-[var(--card)] border border-[var(--line)] rounded-[14px] p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <b className="text-[var(--ink)]">{label}</b>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)}>
                إغلاق ✕
              </Button>
            </div>
            <div className="overflow-auto mt-3 flex items-center justify-center max-h-[75vh]">
              <img
                src={previewImage}
                alt={label}
                className="max-h-[75vh] w-auto rounded-[10px] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
