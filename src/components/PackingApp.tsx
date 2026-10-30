import { useEffect, useState } from 'react';
import {
  Package,
  Trash2,
  Sun,
  Moon,
  Sparkles,
  Loader2,
  RotateCcw,
  AlertTriangle,
  X,
  UploadCloud,
  Images,
  SlidersHorizontal,
  Gauge,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { DropZone } from './DropZone';
import { ImageList } from './ImageList';
import { CanvasPreview } from './CanvasPreview';
import { SettingsPanel } from './SettingsPanel';
import { ResultsPanel } from './ResultsPanel';
import { useImagePacker, MAX_IMAGES } from '../hooks/useImagePacker';
import { useTheme } from '../hooks/useTheme';

export function PackingApp() {
  const {
    images,
    canvasSize,
    options,
    result,
    isProcessing,
    error,
    addImages,
    removeImage,
    clearImages,
    setCanvasSize,
    setOption,
    runPacking,
    resetPacking,
    downloadResult,
    dismissError,
    useMultiPage,
    maxPages,
    setUseMultiPage,
    setMaxPages,
  } = useImagePacker();

  const { theme, toggleTheme } = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const canPack = images.length > 0 && !isProcessing;
  const hasImages = images.length > 0;

  // Reset page when result changes
  useEffect(() => {
    setCurrentPage(1);
  }, [result]);

  // Drop anywhere in the window, not only on the dedicated target.
  useEffect(() => {
    const handleDragOver = (event: DragEvent) => {
      if (isProcessing) return;
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (event: DragEvent) => {
      if (event.relatedTarget === null) setIsDragging(false);
    };

    const handleDrop = (event: DragEvent) => {
      if (isProcessing) return;
      event.preventDefault();
      setIsDragging(false);
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length > 0) void addImages(files);
    };

    const handleWindowBlur = () => setIsDragging(false);

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [addImages, isProcessing]);

  // Ctrl/Cmd + Enter packs without reaching for the mouse.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (images.length > 0 && !isProcessing) void runPacking();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, isProcessing, runPacking]);

  return (
    <div className="min-h-screen bg-canvas text-fg">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-[1500px] items-center justify-between gap-4 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-accent text-accent-fg shadow-panel">
              <Package className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-display text-[17px] font-semibold tracking-tight">PackImg</span>
            <span className="hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
            <span className="eyebrow hidden sm:block">Empaquetado MaxRects</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="btn btn-ghost btn-icon"
              aria-label={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'}
              title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={clearImages}
              disabled={!hasImages || isProcessing}
              className="btn btn-ghost btn-icon hover:text-danger"
              aria-label="Limpiar todas las imágenes"
              title="Limpiar todas las imágenes"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 py-5 lg:px-6">
        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex animate-rise items-start gap-3 rounded-control border border-danger/40 bg-danger-soft px-4 py-3"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-danger">Error</p>
              <p className="mt-0.5 text-sm text-fg-soft">{error}</p>
            </div>
            <button
              type="button"
              onClick={dismissError}
              className="btn btn-ghost btn-icon shrink-0 hover:text-danger"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="grid animate-rise gap-5 lg:grid-cols-[minmax(340px,400px)_minmax(0,1fr)]">
          {/* Ingest rail */}
          <aside className="flex min-w-0 flex-col gap-5">
            <section className="panel">
              <div className="panel-head">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <UploadCloud className="h-4 w-4 text-accent" aria-hidden="true" />
                  Cargar imágenes
                </h2>
                <span className="chip">
                  <span className="num">
                    {images.length}/{MAX_IMAGES}
                  </span>
                </span>
              </div>
              <div className="p-4">
                <DropZone
                  onFilesSelected={addImages}
                  isProcessing={isProcessing}
                  disabled={isProcessing || images.length >= MAX_IMAGES}
                  maxFiles={MAX_IMAGES}
                />
              </div>
            </section>

            {hasImages && (
              <section className="panel animate-rise">
                <ImageList
                  images={images}
                  onRemove={removeImage}
                  onClear={clearImages}
                  isPacking={isProcessing}
                />
              </section>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => void runPacking()}
                disabled={!canPack}
                className="btn btn-primary w-full gap-2.5 py-3.5 text-[15px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Empaquetando…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Empaquetar {hasImages ? `${images.length} imágenes` : ''}
                  </>
                )}
              </button>

              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow">Ctrl + Enter</span>
                {result ? (
                  <button
                    type="button"
                    onClick={resetPacking}
                    className="btn btn-secondary gap-1.5 py-1.5 text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Nuevo empaquetado
                  </button>
                ) : (
                  <span className="eyebrow">MaxRects</span>
                )}
              </div>
            </div>
          </aside>

          {/* Workspace */}
          <div className="flex min-w-0 flex-col gap-5">
            <section className="panel">
              <div className="panel-head">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Images className="h-4 w-4 text-accent" aria-hidden="true" />
                  Lienzo
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className="chip">
                    <span className="num">
                      {canvasSize.width}×{canvasSize.height}
                    </span>
                  </span>
                  <span className="chip">
                    <span className="num">{options.padding} px</span>
                  </span>
                  <span
                    className={cn(
                      'chip',
                      result ? 'border-accent/40 bg-accent-soft text-accent' : 'text-muted'
                    )}
                  >
                    {result ? 'LISTO' : 'SIN EMPAQUETAR'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <CanvasPreview
                  packedImages={result?.packedImages ?? []}
                  canvasSize={result?.canvasSize ?? canvasSize}
                  padding={options.padding}
                  fitMode={options.fitMode}
                  pages={result?.pages}
                  currentPage={currentPage}
                  onPageChange={(page: number) => setCurrentPage(page)}
                  isMultiPage={result?.isMultiPage ?? false}
                />
              </div>
            </section>

            <div className="grid gap-5 md:grid-cols-2">
              <section className="panel">
                <div className="panel-head">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <SlidersHorizontal className="h-4 w-4 text-accent" aria-hidden="true" />
                    Configuración
                  </h2>
                  <span className="eyebrow">{options.sortingStrategy}</span>
                </div>
                <SettingsPanel
                  options={options}
                  onOptionChange={setOption}
                  onCanvasSizeChange={setCanvasSize}
                  onUnitChange={(unit) => setOption('unit', unit)}
                  isPacking={isProcessing}
                  packedCount={result?.stats.packedCount}
                  totalImages={images.length}
                  useMultiPage={useMultiPage}
                  maxPages={maxPages}
                  onUseMultiPageChange={setUseMultiPage}
                  onMaxPagesChange={setMaxPages}
                />
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Gauge className="h-4 w-4 text-accent" aria-hidden="true" />
                    Resultados
                  </h2>
                  {result && (
                    <span className="chip border-accent/40 bg-accent-soft text-accent">
                      <span className="num">{result.efficiency.toFixed(1)}%</span>
                    </span>
                  )}
                </div>
                <ResultsPanel result={result} onDownload={downloadResult} isPacking={isProcessing} />
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Status bar */}
      <footer className="mt-8 border-t border-line bg-surface/60">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 lg:px-6">
          <span className="eyebrow flex items-center gap-1.5">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                isProcessing ? 'animate-pulse bg-warn' : result ? 'bg-ok' : 'bg-muted'
              )}
              aria-hidden="true"
            />
            {isProcessing ? 'Procesando' : result ? 'Empaquetado' : 'En espera'}
          </span>
          <span className="num text-[11px] text-muted">
            {images.length} imagen{images.length === 1 ? '' : 'es'}
          </span>
          <span className="num text-[11px] text-muted">
            {canvasSize.width}×{canvasSize.height} px
          </span>
          <span className="num text-[11px] text-muted">MaxRects</span>
          {result && (
            <span className="num text-[11px] text-muted">
              Eficiencia {result.efficiency.toFixed(1)}%
            </span>
          )}
          <span className="ml-auto text-[11px] text-muted">
            Empaquetado eficiente de imágenes
          </span>
        </div>
      </footer>

      {/* Whole-window drop overlay */}
      {isDragging && (
        <div
          className="fixed inset-0 z-50 flex animate-fade items-center justify-center bg-canvas/80 backdrop-blur-sm"
          aria-hidden="true"
        >
          <div className="mx-6 flex flex-col items-center gap-3 rounded-panel border-2 border-dashed border-accent bg-accent-soft px-14 py-12 text-center">
            <UploadCloud className="h-10 w-10 text-accent" />
            <p className="font-display text-lg font-semibold text-fg">Suelta las imágenes</p>
            <p className="text-xs text-muted">Se añadirán al empaquetado actual</p>
          </div>
        </div>
      )}
    </div>
  );
}
