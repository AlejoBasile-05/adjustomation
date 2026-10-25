import { useCallback, useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => Promise<void>;
  isProcessing?: boolean;
  disabled?: boolean;
  maxFiles?: number;
}

export function DropZone({ onFilesSelected, isProcessing, disabled, maxFiles = 50 }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragActive(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await onFilesSelected(files);
    }
  }, [onFilesSelected, disabled]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await onFilesSelected(files);
      e.target.value = '';
    }
  }, [onFilesSelected]);

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="file-upload"
        disabled={disabled}
      />
      
      <div
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
          'cursor-pointer',
          isDragActive 
            ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20' 
            : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 hover:border-primary-400 hover:bg-primary-50 dark:hover:border-primary-500',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDragLeave}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }}}
        aria-label="Área para subir imágenes"
      >
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
            isDragActive ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          )}>
            <Upload className="w-8 h-8" aria-hidden="true" />
          </div>
          
          <div className="text-center">
            <p className={cn(
              'text-lg font-medium',
              isDragActive ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300'
            )}>
              {isDragActive ? 'Suelta las imágenes aquí' : 'Arrastra y suelta tus imágenes'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              o haz clic para seleccionar archivos
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              PNG, JPG, WEBP, GIF · Máx. {maxFiles} archivos
            </p>
          </div>
          
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 text-primary-600 dark:text-primary-400">
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span className="text-sm font-medium">Procesando...</span>
            </div>
          )}
        </div>
      </div>
      
      <label htmlFor="file-upload" className="sr-only">Seleccionar imágenes</label>
    </div>
  );
}