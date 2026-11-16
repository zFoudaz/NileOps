import React, { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, RefreshCw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Document, DocumentType } from '@/types';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  documentType: DocumentType;
  label: string;
  description?: string;
  existingDoc?: Document | null;
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
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

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|bmp|gif)$/i)) {
      return 'نوع الملف غير مدعوم. يرجى رفع ملف صورة بصيغة (JPG, PNG, WebP).';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return 'حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 10 ميجابايت.';
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

    // Create local object URL for instant preview
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
      const file = e.dataTransfer.files[0];
      await handleFileProcess(file);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await handleFileProcess(file);
    }
    // Reset input value so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const isUploaded = Boolean(existingDoc || (localPreviewUrl && !errorMessage && !isUploading));
  const previewImage =
    localPreviewUrl ||
    (existingDoc?.image_url
      ? existingDoc.image_url.startsWith('http')
        ? existingDoc.image_url
        : `http://localhost:8000${existingDoc.image_url.startsWith('/') ? '' : '/'}${existingDoc.image_url}`
      : null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{label}</h3>
            {isUploaded ? (
              <Badge variant="success" className="gap-1 text-xs font-medium">
                <CheckCircle2 className="h-3 w-3" />
                تم الرفع
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">
                مطلوب
              </Badge>
            )}
          </div>
          {description && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>}
        </div>

        {isUploaded && previewImage && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowModal(true)}
            className="text-slate-600 hover:text-emerald-700 text-xs gap-1.5 shrink-0"
          >
            <Eye className="h-3.5 w-3.5" />
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
        <div className="flex flex-col sm:flex-row items-center gap-4 p-3 rounded-lg border border-emerald-100 bg-emerald-50/40">
          <div
            className="relative h-20 w-32 shrink-0 cursor-pointer overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-inner group"
            onClick={() => setShowModal(true)}
          >
            <img
              src={previewImage}
              alt={label}
              className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Eye className="h-5 w-5" />
            </div>
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-right">
            <p className="text-xs font-semibold text-emerald-900">تم حفظ المستند بنجاح</p>
            <p className="text-xs text-emerald-700/80 mt-0.5 truncate">
              {existingDoc?.file_path || 'تم رفع الملف وجاهز للفحص'}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBrowseClick}
            disabled={disabled || isUploading}
            className="shrink-0 gap-1.5 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                جاري التحديث...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                استبدال الصورة
              </>
            )}
          </Button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition cursor-pointer select-none',
            isDragging
              ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
              : 'border-slate-200 hover:border-emerald-400 hover:bg-slate-50/80',
            (disabled || isUploading) && 'pointer-events-none opacity-60'
          )}
        >
          {isUploading ? (
            <div className="w-full max-w-xs space-y-3 py-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs font-medium text-slate-700">جاري رفع المستند ({uploadProgress}%)...</p>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3 group-hover:scale-105 transition">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-800">
                اسحب صورة المستند وأفلتها هنا، أو <span className="text-emerald-700 underline font-semibold">تصفح جهازك</span>
              </p>
              <p className="text-xs text-slate-400 mt-1.5">
                يدعم صيغ JPG، PNG، WebP بحد أقصى 10 ميجابايت
              </p>
            </>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Image Preview Modal */}
      {showModal && previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-semibold text-slate-900">{label}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModal(false)}
                className="h-8 px-2 text-slate-500 hover:text-slate-800"
              >
                إغلاق ✕
              </Button>
            </div>
            <div className="overflow-auto mt-3 flex items-center justify-center max-h-[75vh]">
              <img
                src={previewImage}
                alt={label}
                className="max-h-[75vh] w-auto rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
