import { cn } from '../utils/cn';
import { RotateCw, Minus, Plus, Grid, Layers, Sparkles, Maximize2 } from 'lucide-react';
import type { PackingOptions, SortingStrategy, CanvasSize } from '../types';

interface SettingsPanelProps {
  options: PackingOptions;
  onOptionChange: <K extends keyof PackingOptions>(key: K, value: PackingOptions[K]) => void;
  onCanvasSizeChange: (size: CanvasSize) => void;
  isPacking?: boolean;
  packedCount?: number;
  totalImages?: number;
}

const sortingStrategies: { value: SortingStrategy; label: string; description: string; icon: React.ReactNode }[] = [
  { 
    value: 'area-desc', 
    label: 'Área descendente', 
    description: 'Más grandes primero (recomendado)',
    icon: <Layers className="w-4 h-4" />
  },
  { 
    value: 'max-side-desc', 
    label: 'Lado mayor descendente', 
    description: 'Prioriza el lado más largo',
    icon: <Maximize2 className="w-4 h-4" />
  },
  { 
    value: 'width-desc', 
    label: 'Ancho descendente', 
    description: 'Más anchas primero',
    icon: <Minus className="w-4 h-4" />
  },
  { 
    value: 'height-desc', 
    label: 'Alto descendente', 
    description: 'Más altas primero',
    icon: <Plus className="w-4 h-4" />
  },
  { 
    value: 'aspect-ratio', 
    label: 'Por aspect ratio', 
    description: 'Agrupa formas similares',
    icon: <Grid className="w-4 h-4" />
  },
  { 
    value: 'area-asc', 
    label: 'Área ascendente', 
    description: 'Más pequeñas primero',
    icon: <Sparkles className="w-4 h-4" />
  },
];

export function SettingsPanel({ 
  options, 
  onOptionChange, 
  onCanvasSizeChange, 
  isPacking,
  packedCount,
  totalImages 
}: SettingsPanelProps) {
  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(100, Math.min(5000, parseInt(e.target.value) || 100));
    onCanvasSizeChange({ ...options.canvasSize, width: value });
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(100, Math.min(5000, parseInt(e.target.value) || 100));
    onCanvasSizeChange({ ...options.canvasSize, height: value });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-6">
      {/* Canvas Size */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Tamaño del lienzo
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Ancho (px)</label>
            <input
              type="number"
              value={options.canvasSize.width}
              onChange={handleWidthChange}
              disabled={isPacking}
              className={cn(
                'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg',
                'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100',
                'focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'text-sm'
              )}
              min={100}
              max={5000}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Alto (px)</label>
            <input
              type="number"
              value={options.canvasSize.height}
              onChange={handleHeightChange}
              disabled={isPacking}
              className={cn(
                'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg',
                'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100',
                'focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'text-sm'
              )}
              min={100}
              max={5000}
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
          Área: {(options.canvasSize.width * options.canvasSize.height).toLocaleString()} px²
        </p>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Estrategia de ordenamiento
        </label>
        <div className="grid grid-cols-2 gap-2">
          {sortingStrategies.map((strategy) => (
            <button
              key={strategy.value}
              onClick={() => onOptionChange('sortingStrategy', strategy.value)}
              disabled={isPacking}
              className={cn(
                'relative p-3 rounded-lg border-2 text-left transition-all',
                'hover:border-primary-400 dark:hover:border-primary-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                options.sortingStrategy === strategy.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  options.sortingStrategy === strategy.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                )}>
                  {strategy.icon}
                </span>
                <span className={cn(
                  'text-sm font-medium',
                  options.sortingStrategy === strategy.value
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-slate-700 dark:text-slate-300'
                )}>
                  {strategy.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 ml-10">
                {strategy.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <RotateCw className="w-4 h-4 text-slate-500" />
          Opciones de empaquetado
        </label>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.allowRotation}
              onChange={(e) => onOptionChange('allowRotation', e.target.checked)}
              disabled={isPacking}
              className={cn(
                'w-4 h-4 rounded border-slate-300 text-primary-600',
                'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Permitir rotación (90°)
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
              Mejora el aprovechamiento
            </span>
          </label>
          
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Espaciado entre imágenes: {options.padding}px
            </label>
            <input
              type="range"
              min={0}
              max={50}
              value={options.padding}
              onChange={(e) => onOptionChange('padding', parseInt(e.target.value))}
              disabled={isPacking}
              className={cn(
                'w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer',
                'accent-primary-600',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      {totalImages && totalImages > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalImages}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {packedCount || 0}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Empaquetadas</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalImages - (packedCount || 0)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pendientes</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}