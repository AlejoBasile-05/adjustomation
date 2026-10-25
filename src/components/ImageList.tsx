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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Imágenes ({images.length})
        </h3>
        {images.length > 1 && (
          <button
            onClick={onClear}
            disabled={isPacking}
            className={cn(
              'text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
              'font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            Limpiar todo
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-h-64 overflow-y-auto p-1 pr-2">
        {images.map((img) => (
          <div
            key={img.id}
            className={cn(
              'relative group bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700',
              'overflow-hidden aspect-square shadow-sm hover:shadow-md transition-shadow'
            )}
          >
            <img
              src={img.preview}
              alt={img.file.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onRemove(img.id)}
                disabled={isPacking}
                className={cn(
                  'w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center',
                  'hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                aria-label={`Eliminar ${img.file.name}`}
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs">
              <div className="flex items-center justify-between">
                <span className="truncate max-w-[60px]">{img.file.name}</span>
                <span className="flex items-center gap-1 text-[10px] opacity-90">
                  <ImageIcon className="w-3 h-3" aria-hidden="true" />
                  {img.width}×{img.height}
                </span>
              </div>
            </div>
            
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {img.width !== img.height && (
                <span className="px-1.5 py-0.5 bg-slate-900/80 text-[10px] rounded text-white">
                  {img.aspectRatio.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">
        Total: {images.reduce((sum, img) => sum + img.area, 0).toLocaleString()} px²
        {' | '}
        Promedio: {Math.round(images.reduce((sum, img) => sum + img.area, 0) / images.length).toLocaleString()} px²
      </div>
    </div>
  );
}