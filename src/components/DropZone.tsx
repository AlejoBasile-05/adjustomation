import { useCallback, useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => Promise<void>;
  isProcessing?: boolean;
  disabled?: boolean;
  maxFiles?: number;
}

const ACCEPTED_FORMATS = ['PNG', 'JPG', 'WEBP', 'GIF'];

export function DropZone({ onFilesSelected, isProcessing, disabled, maxFiles = 50 }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isInert = Boolean(disabled);

  const handleDrag = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) {
      setIsDragActive(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);

    if (disabled) return;

    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      await onFilesSelected(files);
    }
  }, [onFilesSelected, disabled]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      await onFilesSelected(files);
      event.target.value = '';
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
          'group relative flex cursor-pointer flex-col items-center gap-4 rounded-control border-2 border-dashed px-4 py-7 text-center',
          'transition-all duration-200 outline-none',
          isDragActive
            ? 'border-accent bg-accent-soft'
            : 'border-line-strong bg-sunken/60 hover:border-accent/60 hover:bg-accent-soft/40',
          isInert && 'cursor-not-allowed opacity-50 hover:border-line-strong hover:bg-sunken/60'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDragLeave}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClick();
          }
        }}
        aria-label="Área para subir imágenes"
        aria-disabled={isInert}
      >
        {/* Icon well */}
        <div
          className={cn(
            'grid h-12 w-12 place-items-center rounded-control border transition-all duration-200',
            isDragActive
              ? 'scale-105 border-accent bg-accent text-accent-fg'
              : 'border-line bg-raised text-muted group-hover:text-accent'
          )}
        >
          <Upload className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="space-y-1">
          <p className="font-display text-base font-semibold text-fg">
            {isDragActive ? 'Suelta las imágenes aquí' : 'Arrastra y suelta tus imágenes'}
          </p>
          <p className="text-sm text-muted">o haz clic para seleccionar archivos</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {ACCEPTED_FORMATS.map((format) => (
            <span key={format} className="chip">
              {format}
            </span>
          ))}
          <span className="chip border-accent/40 bg-accent-soft text-accent">
            Máx. {maxFiles}
          </span>
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 text-accent" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span className="text-xs font-medium">Procesando…</span>
          </div>
        )}
      </div>

      <label htmlFor="file-upload" className="sr-only">Seleccionar imágenes</label>
    </div>
  );
}
