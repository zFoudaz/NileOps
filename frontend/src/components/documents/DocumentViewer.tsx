import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  RotateCcw,
  Image as ImageIcon,
  FileX,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Document } from '@/types';
import { DOCUMENT_TYPE_LABELS } from '@/lib/constants';
import { resolveImageUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface DocumentViewerProps {
  documents?: Document[];
  selectedDocumentId?: string;
  onSelectDocument?: (id: string) => void;
  document?: Document;
  className?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documents = [],
  selectedDocumentId,
  onSelectDocument,
  document: singleDoc,
  className,
}) => {
  // Normalize document list
  const docList = React.useMemo(() => {
    if (documents.length > 0) return documents;
    if (singleDoc) return [singleDoc];
    return [];
  }, [documents, singleDoc]);

  // Selected doc ID
  const [internalSelectedId, setInternalSelectedId] = useState<string>(
    selectedDocumentId || (docList[0]?.id ?? '')
  );

  const activeId = selectedDocumentId || internalSelectedId;
  const currentDoc = docList.find((d) => d.id === activeId) || docList[0];

  const handleSelectDoc = (id: string) => {
    if (onSelectDocument) {
      onSelectDocument(id);
    } else {
      setInternalSelectedId(id);
    }
    // Reset view transforms on doc change
    resetTransform();
  };

  // Zoom, pan & rotation states
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);

  const resetTransform = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 4.0));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(Number((prev - 0.25).toFixed(2)), 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1 && pan.x === 0 && pan.y === 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || isFullscreen) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  // Reset error when doc changes or user retries
  const handleRetry = (docId: string) => {
    setImageErrors((prev) => ({ ...prev, [docId]: false }));
  };

  // Keyboard navigation & escape for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      if (isFullscreen) {
        if (e.key === '+' || e.key === '=') handleZoomIn();
        if (e.key === '-') handleZoomOut();
        if (e.key === 'r' || e.key === 'R') handleRotate();
        if (e.key === '0') resetTransform();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, resetTransform]);

  const rawUrl = currentDoc ? currentDoc.image_url || currentDoc.file_path : '';
  const resolvedUrl = rawUrl ? resolveImageUrl(rawUrl) : '';
  const hasError = currentDoc ? imageErrors[currentDoc.id] : true;

  const docLabel = currentDoc
    ? DOCUMENT_TYPE_LABELS[currentDoc.document_type] || currentDoc.document_type
    : 'المستند';

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm',
        isFullscreen &&
          'fixed inset-0 z-50 rounded-none border-0 bg-slate-950/95 text-white flex flex-col',
        className
      )}
      dir="rtl"
    >
      {/* Top Toolbar */}
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 p-3 border-b bg-slate-50 select-none',
          isFullscreen
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'border-slate-200 text-slate-800'
        )}
      >
        {/* Document Title & Badge */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'h-7 w-7 rounded-lg flex items-center justify-center shrink-0',
              isFullscreen ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
            )}
          >
            <ImageIcon className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-sm">{docLabel}</span>
            {currentDoc && (
              <span className="text-xs text-slate-400 mr-2">
                {currentDoc.ocr_completed ? (
                  <Badge variant="success" className="text-[10px] py-0 px-1.5 gap-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    تم الفحص الآلي
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                    بانتظار المعالجة
                  </Badge>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              title="تكبير (+)"
              className="h-8 w-8 p-0 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <span className="text-xs font-mono font-medium px-2 min-w-[50px] text-center text-slate-700 select-none">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              title="تصغير (-)"
              className="h-8 w-8 p-0 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetTransform}
              title="إعادة ضبط الحجم (0)"
              className="h-8 w-8 p-0 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRotate}
            title="تدوير 90 درجة مع عقارب الساعة (R)"
            className="h-8 px-2.5 text-xs gap-1 border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>تدوير</span>
          </Button>

          {isFullscreen ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setIsFullscreen(false)}
              title="خروج من ملء الشاشة (Esc)"
              className="h-8 px-3 text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-xs transition"
            >
              <X className="h-3.5 w-3.5" />
              <span>خروج من ملء الشاشة</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(true)}
              title="ملء الشاشة"
              className="h-8 px-2.5 text-xs gap-1 border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>ملء الشاشة</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={cn(
          'relative flex-1 min-h-[360px] max-h-[560px] bg-slate-950/5 flex items-center justify-center overflow-hidden select-none',
          isFullscreen && 'max-h-none min-h-0 bg-slate-950 flex-1',
          zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        )}
      >
        {/* Floating exit button for quick access during fullscreen */}
        {isFullscreen && (
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            title="خروج من ملء الشاشة (Esc)"
            className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-slate-900/90 hover:bg-rose-600 text-slate-200 hover:text-white px-3 py-1.5 rounded-full border border-slate-700 shadow-lg backdrop-blur-xs transition cursor-pointer text-xs font-medium"
          >
            <X className="h-4 w-4" />
            <span>خروج (Esc)</span>
          </button>
        )}
        {!currentDoc || !resolvedUrl ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <FileX className="h-12 w-12 stroke-1 mb-2 text-slate-300" />
            <p className="font-medium text-sm text-slate-600">لا يوجد مستند محدد</p>
            <p className="text-xs text-slate-400 mt-1">يرجى اختيار أحد المستندات من القائمة</p>
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 max-w-md">
            <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <AlertCircle className="h-6 w-6" />
            </div>
            <p className="font-semibold text-slate-800 text-base">تعذر تحميل صورة المستند</p>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              المسار المسجل: <span className="font-mono text-slate-600 dir-ltr">{currentDoc.file_path}</span>
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleRetry(currentDoc.id)}
                className="text-xs"
              >
                إعادة المحاولة
              </Button>
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 underline font-medium"
              >
                <span>فتح في نافذة جديدة</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ) : (
          <div
            className="flex items-center justify-center w-full h-full p-4 transition-transform duration-75"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            <img
              src={resolvedUrl}
              alt={docLabel}
              draggable={false}
              onError={() => {
                if (currentDoc) {
                  setImageErrors((prev) => ({ ...prev, [currentDoc.id]: true }));
                }
              }}
              className={cn(
                'max-w-full w-auto object-contain rounded-lg shadow-md pointer-events-none transition-all',
                isFullscreen ? 'max-h-[82vh]' : 'max-h-[500px]'
              )}
            />
          </div>
        )}

        {/* Quick Zoom Helper Pill */}
        {zoom > 1 && (
          <div className="absolute bottom-3 left-3 bg-slate-900/80 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5 shadow-md">
            <span>انقر واسحب للتحريك</span>
            <span className="text-slate-400">|</span>
            <button
              type="button"
              onClick={resetTransform}
              className="text-emerald-400 hover:underline cursor-pointer"
            >
              إعادة الضبط
            </button>
          </div>
        )}
      </div>

      {/* Thumbnail Strip / Switcher for multiple documents */}
      {docList.length > 1 && (
        <div
          className={cn(
            'p-3 border-t bg-slate-50/70 overflow-x-auto',
            isFullscreen && 'bg-slate-900 border-slate-800'
          )}
        >
          <div className="flex items-center gap-2 min-w-max">
            {docList.map((doc, idx) => {
              const isSelected = doc.id === currentDoc?.id;
              const title = DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type;
              const url = doc.image_url || doc.file_path;
              const previewUrl = url ? resolveImageUrl(url) : '';

              return (
                <button
                  key={doc.id || idx}
                  type="button"
                  onClick={() => handleSelectDoc(doc.id)}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg border text-right transition cursor-pointer',
                    isSelected
                      ? 'border-emerald-500 bg-white shadow-xs ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300 opacity-80 hover:opacity-100',
                    isFullscreen &&
                      (isSelected
                        ? 'bg-slate-800 border-emerald-400 ring-emerald-400 text-white'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-slate-800')
                  )}
                >
                  <div className="h-10 w-10 rounded bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                    {previewUrl && !imageErrors[doc.id] ? (
                      <img
                        src={previewUrl}
                        alt={title}
                        className="h-full w-full object-cover"
                        onError={() =>
                          setImageErrors((prev) => ({ ...prev, [doc.id]: true }))
                        }
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">
                      {title}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      مستند {idx + 1} من {docList.length}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentViewer;
