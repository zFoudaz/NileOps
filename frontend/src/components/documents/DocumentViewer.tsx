import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, RotateCcw, Image as ImageIcon, X } from 'lucide-react';
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
  const docList = React.useMemo(() => {
    if (documents.length > 0) return documents;
    if (singleDoc) return [singleDoc];
    return [];
  }, [documents, singleDoc]);

  const [internalSelectedId, setInternalSelectedId] = useState<string>(
    selectedDocumentId || (docList[0]?.id ?? '')
  );

  const activeId = selectedDocumentId || internalSelectedId;
  const currentDoc = docList.find((d) => d.id === activeId) || docList[0];

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

  const handleSelectDoc = (id: string) => {
    if (onSelectDocument) {
      onSelectDocument(id);
    } else {
      setInternalSelectedId(id);
    }
    resetTransform();
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 4.0));
  const handleZoomOut = () => setZoom((prev) => Math.max(Number((prev - 0.25).toFixed(2)), 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1 && pan.x === 0 && pan.y === 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || isFullscreen) {
      e.preventDefault();
      if (e.deltaY < 0) handleZoomIn();
      else handleZoomOut();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
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
        'flex flex-col rounded-[14px] border border-[var(--line)] bg-[var(--card)] overflow-hidden',
        isFullscreen && 'fixed inset-0 z-50 rounded-none border-0 bg-[#0a2827] text-white flex flex-col',
        className
      )}
      dir="rtl"
    >
      {/* Toolbar */}
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 p-3 border-b select-none',
          isFullscreen
            ? 'bg-[var(--teal2)] border-white/15 text-white'
            : 'bg-[var(--bg)]/70 border-[var(--line)] text-[var(--ink)]'
        )}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <b className="text-[14px]">{docLabel}</b>
          {currentDoc && currentDoc.ocr_required === false && (
            <Badge variant="warning" className="text-[11px]">
              صورة للمراجعة (بدون OCR)
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-white border border-[var(--line)] rounded-[8px] p-0.5 text-[var(--ink)]">
            <button
              type="button"
              onClick={handleZoomIn}
              title="تكبير"
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-[var(--hover-row)]"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="ltr text-[12px] font-semibold px-1.5 min-w-[44px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomOut}
              title="تصغير"
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-[var(--hover-row)]"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={resetTransform}
              title="إعادة ضبط"
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-[var(--hover-row)]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRotate}
            className={cn(
              'min-h-[34px] px-2.5 text-[12px]',
              isFullscreen && 'text-white border-white/50 hover:bg-white/10'
            )}
          >
            <RotateCw className="h-3.5 w-3.5" />
            تدوير
          </Button>

          {isFullscreen ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setIsFullscreen(false)}
              className="min-h-[34px] px-3 text-[12px]"
            >
              <X className="h-3.5 w-3.5" />
              إغلاق
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(true)}
              className="min-h-[34px] px-2.5 text-[12px]"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              تكبير
            </Button>
          )}
        </div>
      </div>

      {/* Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={cn(
          'relative flex-1 min-h-[300px] max-h-[500px] bg-[var(--bg)]/60 flex items-center justify-center overflow-hidden select-none',
          isFullscreen && 'max-h-none min-h-0 bg-[#0a2827] flex-1',
          zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        )}
      >
        {!currentDoc || !resolvedUrl ? (
          <div className="p-8 text-center text-[var(--mut)] text-sm">لا يوجد مستند للعرض</div>
        ) : hasError ? (
          <div className="p-8 text-center text-sm">
            <p className="font-semibold text-[var(--bad)] mb-2">تعذر تحميل صورة المستند</p>
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImageErrors((prev) => ({ ...prev, [currentDoc.id]: false }))}
              >
                إعادة المحاولة
              </Button>
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--teal)] font-semibold underline text-[13px]"
              >
                فتح في نافذة جديدة
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
              onError={() =>
                currentDoc && setImageErrors((prev) => ({ ...prev, [currentDoc.id]: true }))
              }
              className={cn(
                'max-w-full w-auto object-contain rounded-[10px] border border-[var(--line)] pointer-events-none',
                isFullscreen ? 'max-h-[82vh]' : 'max-h-[440px]'
              )}
            />
          </div>
        )}
      </div>

      {/* Document Switcher */}
      {docList.length > 1 && (
        <div
          className={cn(
            'p-3 border-t overflow-x-auto',
            isFullscreen ? 'bg-[var(--teal2)] border-white/15' : 'bg-[var(--bg)]/50 border-[var(--line)]'
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
                    'flex items-center gap-2 p-2 rounded-[10px] border-[1.5px] text-right transition cursor-pointer',
                    isSelected
                      ? 'border-[var(--teal)] bg-[var(--card)] text-[var(--ink)]'
                      : 'border-[var(--line)] bg-[var(--card)]/70 hover:bg-[var(--card)] text-[var(--ink)]',
                    doc.ocr_required === false && !isSelected && 'border-[var(--gold)]'
                  )}
                >
                  <div className="h-9 w-9 rounded-[6px] bg-[var(--bg)] overflow-hidden flex items-center justify-center shrink-0 border border-[var(--line)]">
                    {previewUrl && !imageErrors[doc.id] ? (
                      <img
                        src={previewUrl}
                        alt={title}
                        className="h-full w-full object-cover"
                        onError={() => setImageErrors((prev) => ({ ...prev, [doc.id]: true }))}
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-[var(--mut)]" />
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-semibold leading-tight">{title}</div>
                    {doc.ocr_required === false && (
                      <div className="text-[11px] text-[var(--goldtx)]">بدون OCR</div>
                    )}
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
