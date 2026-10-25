import { useState } from 'react';
import { Package, RotateCcw, Trash2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../utils/cn';
import { DropZone } from './DropZone';
import { ImageList } from './ImageList';
import { CanvasPreview } from './CanvasPreview';
import { SettingsPanel } from './SettingsPanel';
import { ResultsPanel } from './ResultsPanel';
import { useImagePacker } from '../hooks/useImagePacker';

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
  } = useImagePacker();

  const [showSettings, setShowSettings] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  const handleFilesDrop = async (files: File[]) => {
    await addImages(files);
  };

  const handlePack = async () => {
    await runPacking();
  };

  const handleDownload = () => {
    downloadResult();
  };

  const handleReset = () => {
    resetPacking();
  };

  const handleClearAll = () => {
    clearImages();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                <Package className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">PackImg</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Empaquetado inteligente de imágenes</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearAll}
                disabled={images.length === 0 || isProcessing}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  'text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20',
                  'disabled:opacity-30 disabled:cursor-not-allowed'
                )}
                aria-label="Limpiar todas las imágenes"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Toast */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 animate-slide-in" role="alert">
            <span className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">⚠</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
            <button
              onClick={() => {/* Error auto-clears on next action */}}
              className="text-red-500 hover:text-red-700"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Panel - Controls & Images */}
          <div className="lg:col-span-5 space-y-6">
            {/* Drop Zone */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <DropZone 
                onFilesSelected={handleFilesDrop} 
                isProcessing={isProcessing}
                disabled={isProcessing}
              />
            </div>

            {/* Image List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <ImageList 
                images={images} 
                onRemove={removeImage}
                onClear={clearImages}
                isPacking={isProcessing}
              />
            </div>

            {/* Pack Button */}
            <button
              onClick={handlePack}
              disabled={images.length === 0 || isProcessing}
              className={cn(
                'w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all',
                'flex items-center justify-center gap-3',
                'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900',
                images.length > 0 && !isProcessing
                  ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/25'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-600 dark:text-slate-400'
              )}
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Empaquetando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Empaquetar ({images.length} imágenes)
                </>
              )}
            </button>

            {result && (
              <button
                onClick={handleReset}
                className="w-full py-3 px-6 rounded-xl font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Nuevo empaquetado
              </button>
            )}
          </div>

          {/* Right Panel - Preview & Results */}
          <div className="lg:col-span-7 space-y-6">
            {/* Canvas Preview */}
            <div className={cn('bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden', showPreview ? '' : 'hidden')}>
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  Vista previa del lienzo
                </h2>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={cn(
                    'p-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                  )}
                  aria-label={showPreview ? 'Ocultar vista previa' : 'Mostrar vista previa'}
                >
                  {showPreview ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
              <div className="p-4 overflow-x-auto">
                <div className="flex justify-center">
                  <CanvasPreview
                    packedImages={result?.packedImages || []}
                    canvasSize={result?.canvasSize || canvasSize}
                    padding={options.padding}
                  />
                </div>
              </div>
            </div>

            {/* Settings & Results */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Settings Panel */}
              <div className={cn('lg:col-span-1', showSettings ? '' : 'hidden')}>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <RotateCcw className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      Configuración
                    </h2>
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className={cn(
                        'p-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                      )}
                      aria-label={showSettings ? 'Ocultar configuración' : 'Mostrar configuración'}
                    >
                      {showSettings ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                  <SettingsPanel
                    options={options}
                    onOptionChange={setOption}
                    onCanvasSizeChange={setCanvasSize}
                    isPacking={isProcessing}
                    packedCount={result?.stats.packedCount}
                    totalImages={images.length}
                  />
                </div>
              </div>

              {/* Results Panel */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      Resultados
                    </h2>
                  </div>
                  <ResultsPanel
                    result={result}
                    onDownload={handleDownload}
                    isPacking={isProcessing}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            PackImg · Empaquetado eficiente de imágenes con algoritmo MaxRects
          </p>
        </div>
      </footer>
    </div>
  );
}