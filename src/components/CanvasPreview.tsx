import { useCallback, useState } from 'react';
import { Grid3x3, LayoutGrid, Maximize2, Scan, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import type { PackedImage, CanvasSize, PackedPage } from '../types';

interface CanvasPreviewProps {
  packedImages: PackedImage[];
  canvasSize: CanvasSize;
  padding: number;
  fitMode?: 'contain' | 'cover';
  showGrid?: boolean;
  backgroundColor?: string;
  // Multi-page support
  pages?: PackedPage[];
  currentPage?: number;
  onPageChange?: (page: number) => void;
  isMultiPage?: boolean;
}

type ZoomMode = 'fit' | 'actual';

export function CanvasPreview({
  packedImages,
  canvasSize,
  padding,
  fitMode = 'contain',
  showGrid = true,
  backgroundColor = '#ffffff',
  pages,
  currentPage = 1,
  onPageChange = () => {},
  isMultiPage = false,
}: CanvasPreviewProps) {
  const [zoomMode, setZoomMode] = useState<ZoomMode>('fit');
  const [gridVisible, setGridVisible] = useState(showGrid);

  // Get current page images and canvas size
  const currentPageImages = pages && pages.length > 0 && currentPage <= pages.length
    ? pages[currentPage - 1].images
    : packedImages;

  const currentPageCanvasSize = pages && pages.length > 0 && currentPage <= pages.length
    ? pages[currentPage - 1].canvasSize
    : canvasSize;

  const totalPages = pages?.length || 1;
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // Page navigation handlers (stable callbacks)
  const handlePrevPage = useCallback(() => {
    if (canGoPrev) {
      onPageChange(currentPage - 1);
    }
  }, [canGoPrev, currentPage, onPageChange]);

  const handleNextPage = useCallback(() => {
    if (canGoNext) {
      onPageChange(currentPage + 1);
    }
  }, [canGoNext, currentPage, onPageChange]);

  // Fit the plate inside a 720x540 budget, never upscaling past 1:1.
  const fitScale = Math.min(720 / currentPageCanvasSize.width, 540 / currentPageCanvasSize.height, 1);
  const scale = zoomMode === 'fit' ? fitScale : 1;

  const displayWidth = currentPageCanvasSize.width * scale;
  const displayHeight = currentPageCanvasSize.height * scale;
  const isEmpty = currentPageImages.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-control border border-dashed border-line-strong bg-sunken/50 px-6 py-14 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-control border border-dashed border-line-strong bg-raised text-muted">
          <LayoutGrid className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="font-display text-sm font-semibold text-fg-soft">El lienzo está vacío</p>
          <p className="max-w-[38ch] text-xs text-muted">
            Carga imágenes y ejecuta el empaquetado para ver el resultado aquí.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">Ajuste de vista</span>

        <div className="flex items-center gap-1">
          <div
            className="flex items-center gap-0.5 rounded-control border border-line bg-sunken p-0.5"
            role="group"
            aria-label="Zoom del lienzo"
          >
            <button
              type="button"
              onClick={() => setZoomMode('fit')}
              aria-pressed={zoomMode === 'fit'}
              className={cn(
                'btn gap-1.5 rounded-[8px] px-2.5 py-1 text-[11px]',
                zoomMode === 'fit'
                  ? 'bg-accent-soft text-accent'
                  : 'text-muted hover:text-fg'
              )}
            >
              <Scan className="h-3.5 w-3.5" aria-hidden="true" />
              Ajustar
            </button>
            <button
              type="button"
              onClick={() => setZoomMode('actual')}
              aria-pressed={zoomMode === 'actual'}
              className={cn(
                'btn gap-1.5 rounded-[8px] px-2.5 py-1 text-[11px]',
                zoomMode === 'actual'
                  ? 'bg-accent-soft text-accent'
                  : 'text-muted hover:text-fg'
              )}
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
              100%
            </button>
          </div>

          <button
            type="button"
            onClick={() => setGridVisible((visible) => !visible)}
            aria-pressed={gridVisible}
            aria-label={gridVisible ? 'Ocultar cuadrícula' : 'Mostrar cuadrícula'}
            className={cn(
              'btn btn-ghost btn-icon h-8 w-8',
              gridVisible ? 'text-accent' : 'text-muted'
            )}
          >
            <Grid3x3 className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Page navigation for multi-page - top right */}
          {isMultiPage && totalPages > 1 && (
            <div className="flex items-center gap-1.5 ml-4 border-l border-line pl-4">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={!canGoPrev}
                aria-label="Página anterior"
                className={cn(
                  'btn btn-ghost btn-icon h-10 w-10 rounded-control',
                  canGoPrev ? 'text-fg hover:bg-accent-soft' : 'text-muted opacity-50 cursor-not-allowed'
                )}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="chip border-line bg-surface/90 text-fg backdrop-blur-md px-3 py-1.5 text-sm">
                <span className="num font-medium">
                  Página {currentPage} de {totalPages}
                </span>
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={!canGoNext}
                aria-label="Página siguiente"
                className={cn(
                  'btn btn-ghost btn-icon h-10 w-10 rounded-control',
                  canGoNext ? 'text-fg hover:bg-accent-soft' : 'text-muted opacity-50 cursor-not-allowed'
                )}
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drafting-table well */}
      <div className="relative overflow-auto scroll-thin rounded-control border border-line bg-sunken blueprint">
        <div className="grain pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative flex min-h-[300px] min-w-full items-center justify-center p-4">
          {/* Paper plate */}
          <div
            className="relative shrink-0 shadow-lift ring-1 ring-line-strong"
            style={{ width: displayWidth, height: displayHeight }}
          >
            <div className="absolute inset-0" style={{ backgroundColor }} />

            {gridVisible && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)',
                  backgroundSize: `${Math.max(8, 50 * scale)}px ${Math.max(8, 50 * scale)}px`,
                }}
              />
            )}

            {currentPageImages.map((img) => (
              <div
                key={img.id}
                className="absolute"
                style={{
                  left: img.x * scale,
                  top: img.y * scale,
                  width: img.displayWidth * scale,
                  height: img.displayHeight * scale,
                  transform: img.rotated ? 'rotate(90deg)' : 'none',
                  transformOrigin: 'top left',
                }}
              >
                {fitMode === 'cover' && img.sourceRect ? (
                  <canvas
                    ref={(el) => {
                      if (el) {
                        const ctx = el.getContext('2d');
                        if (ctx) {
                          const image = new Image();
                          image.onload = () => {
                            const { sx, sy, sw, sh } = img.sourceRect!;
                            ctx.drawImage(image, sx, sy, sw, sh, 0, 0, img.displayWidth, img.displayHeight);
                          };
                          image.src = img.preview;
                        }
                      }
                    }}
                    className="h-full w-full"
                    width={img.displayWidth}
                    height={img.displayHeight}
                    style={{ imageRendering: 'crisp-edges' }}
                  >
                  </canvas>
                ) : (
                  <img
                    src={img.preview}
                    alt={img.file.name}
                    className="h-full w-full object-cover"
                    style={{ imageRendering: 'crisp-edges' }}
                  />
                )}
                {padding > 0 && (
                  <div
                    className="pointer-events-none absolute inset-0 border-line-strong/60"
                    style={{
                      margin: -padding * scale,
                      borderWidth: `${Math.max(1, padding * scale)}px`,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Readout */}
        <div className="sticky bottom-2 left-0 flex w-full justify-between px-2 items-center">
          <span className="chip border-line bg-surface/90 text-fg backdrop-blur-md">
            <span className="num">
              {currentPageCanvasSize.width} × {currentPageCanvasSize.height} px
            </span>
            <span className="text-muted">·</span>
            <span className="num">{currentPageImages.length} piezas</span>
            <span className="text-muted">·</span>
            <span className="num">{Math.round(scale * 100)}%</span>
          </span>
        </div>
      </div>
    </div>
  );
}
