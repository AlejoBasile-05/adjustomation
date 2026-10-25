import { X, Image as ImageIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import type { ImageFile } from '../types';

interface ImageListProps {
  images: ImageFile[];
  onRemove: (id: string) => void;
  onClear: () => void;
  isPacking?: boolean;
}

export function ImageList({ images, onRemove, onClear, isPacking }: ImageListProps) {
  if (images.length === 0) {
    return null;
  }

  const totalArea = images.reduce((sum, img) => sum + img.area, 0);

  return (
    <div>
      <div className="panel-head">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ImageIcon className="h-4 w-4 text-accent" aria-hidden="true" />
          Imágenes
          <span className="chip">
            <span className="num">{images.length}</span>
          </span>
        </h2>
        {images.length > 1 && (
          <button
            type="button"
            onClick={onClear}
            disabled={isPacking}
            className="btn btn-ghost px-2 py-1 text-xs hover:text-danger"
          >
            Limpiar todo
          </button>
        )}
      </div>

      <div className="animate-pop space-y-3 p-3">
        <div className="scroll-thin grid max-h-64 grid-cols-3 gap-2 overflow-y-auto p-1 sm:grid-cols-4 xl:grid-cols-5">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-[10px] border border-line bg-raised"
            >
              <img
                src={img.preview}
                alt={img.file.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                loading="lazy"
              />

              {/* Dimensions + name, always readable */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-1.5 pb-1 pt-4">
                <p className="truncate text-[10px] leading-tight text-white/90">{img.file.name}</p>
                <p className="num text-[10px] leading-tight text-white/65">
                  {img.width}×{img.height}
                </p>
              </div>

              {/* Aspect ratio, hover only, purely decorative */}
              {img.width !== img.height && (
                <span className="num absolute right-1 top-1 rounded-full bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold text-white/85 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  {img.aspectRatio.toFixed(2)}
                </span>
              )}

              {/* Remove: reachable by mouse AND keyboard */}
              <button
                type="button"
                onClick={() => onRemove(img.id)}
                disabled={isPacking}
                className={cn(
                  'absolute left-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-danger text-white',
                  'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100',
                  'focus-visible:opacity-100 hover:brightness-110',
                  'disabled:cursor-not-allowed disabled:opacity-40'
                )}
                aria-label={`Eliminar ${img.file.name}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="stat-tile">
            <p className="num text-sm font-semibold text-fg">{totalArea.toLocaleString()}</p>
            <p className="eyebrow">Área total px²</p>
          </div>
          <div className="stat-tile">
            <p className="num text-sm font-semibold text-fg-soft">
              {Math.round(totalArea / images.length).toLocaleString()}
            </p>
            <p className="eyebrow">Promedio px²</p>
          </div>
        </div>
      </div>
    </div>
  );
}
