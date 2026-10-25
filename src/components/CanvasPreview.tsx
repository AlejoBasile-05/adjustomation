import { useState } from 'react';
import { Grid3x3, LayoutGrid, Maximize2, Scan } from 'lucide-react';
import { cn } from '../utils/cn';
import type { PackedImage, CanvasSize } from '../types';

interface CanvasPreviewProps {
  packedImages: PackedImage[];
  canvasSize: CanvasSize;
  padding: number;
  showGrid?: boolean;
  backgroundColor?: string;
}

type ZoomMode = 'fit' | 'actual';

export function CanvasPreview({
  packedImages,
  canvasSize,
  padding,
  showGrid = true,
  backgroundColor = '#ffffff',
}: CanvasPreviewProps) {
  const [zoomMode, setZoomMode] = useState<ZoomMode>('fit');
  const [gridVisible, setGridVisible] = useState(showGrid);

  // Fit the plate inside a 720x540 budget, never upscaling past 1:1.
  const fitScale = Math.min(720 / canvasSize.width, 540 / canvasSize.height, 1);
  const scale = zoomMode === 'fit' ? fitScale : 1;

  const displayWidth = canvasSize.width * scale;
  const displayHeight = canvasSize.height * scale;
  const isEmpty = packedImages.length === 0;

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

            {packedImages.map((img) => (
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
                <img
                  src={img.preview}
                  alt={img.file.name}
                  className="h-full w-full object-cover"
                  style={{ imageRendering: 'crisp-edges' }}
                />
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
        <div className="pointer-events-none sticky bottom-2 left-0 flex w-full justify-end px-2">
          <span className="chip border-line bg-surface/90 text-fg backdrop-blur-md">
            <span className="num">
              {canvasSize.width} × {canvasSize.height} px
            </span>
            <span className="text-muted">·</span>
            <span className="num">{packedImages.length} piezas</span>
            <span className="text-muted">·</span>
            <span className="num">{Math.round(scale * 100)}%</span>
          </span>
        </div>
      </div>
    </div>
  );
}
