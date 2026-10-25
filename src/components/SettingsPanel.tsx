import { cn } from '../utils/cn';
import { Minus, Plus, Grid, Layers, Sparkles, Maximize2 } from 'lucide-react';
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
    <div className="p-4 space-y-5">
      {/* Canvas Size */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="eyebrow">Tamaño del lienzo</span>
          <span className="num text-[11px] text-muted">
            {(options.canvasSize.width * options.canvasSize.height).toLocaleString()} px²
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="canvas-width" className="mb-1 block text-[10px] text-muted">
              Ancho
            </label>
            <div className="relative">
              <input
                id="canvas-width"
                type="number"
                value={options.canvasSize.width}
                onChange={handleWidthChange}
                disabled={isPacking}
                className="field pr-7"
                min={100}
                max={5000}
                aria-label="Ancho del lienzo en píxeles"
              />
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-muted">
                px
              </span>
            </div>
          </div>
          <div>
            <label htmlFor="canvas-height" className="mb-1 block text-[10px] text-muted">
              Alto
            </label>
            <div className="relative">
              <input
                id="canvas-height"
                type="number"
                value={options.canvasSize.height}
                onChange={handleHeightChange}
                disabled={isPacking}
                className="field pr-7"
                min={100}
                max={5000}
                aria-label="Alto del lienzo en píxeles"
              />
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-muted">
                px
              </span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-muted">
          Se ajusta automáticamente al cargar imágenes; puedes fijarlo a mano.
        </p>
      </div>

      <div className="border-t border-line pt-4">
        <span className="eyebrow">Estrategia de ordenamiento</span>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {sortingStrategies.map((strategy) => (
            <button
              key={strategy.value}
              type="button"
              onClick={() => onOptionChange('sortingStrategy', strategy.value)}
              disabled={isPacking}
              aria-pressed={options.sortingStrategy === strategy.value}
              className={cn(
                'rounded-control border p-2.5 text-left transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-50',
                options.sortingStrategy === strategy.value
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-raised hover:border-line-strong'
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={cn(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-[8px]',
                    options.sortingStrategy === strategy.value
                      ? 'bg-accent text-accent-fg'
                      : 'bg-sunken text-muted'
                  )}
                >
                  {strategy.icon}
                </span>
                <span
                  className={cn(
                    'truncate text-xs font-semibold',
                    options.sortingStrategy === strategy.value ? 'text-fg' : 'text-fg-soft'
                  )}
                >
                  {strategy.label}
                </span>
              </div>
              <p className="text-[10px] leading-snug text-muted">{strategy.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-line pt-4">
        <span className="eyebrow">Opciones de empaquetado</span>
        <div className="mt-2 space-y-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-control border border-line bg-raised px-3 py-2.5">
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={options.allowRotation}
                onChange={(e) => onOptionChange('allowRotation', e.target.checked)}
                disabled={isPacking}
                className={cn(
                  'h-4 w-4 rounded accent-[var(--app-accent)]',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
              <span className="text-sm text-fg">Permitir rotación (90°)</span>
            </span>
            <span className="hidden text-[10px] text-muted sm:block">Mejora el aprovechamiento</span>
          </label>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="canvas-padding" className="text-[10px] text-muted">
                Espaciado
              </label>
              <span className="chip">
                <span className="num">{options.padding}</span> px
              </span>
            </div>
            <input
              id="canvas-padding"
              type="range"
              min={0}
              max={50}
              value={options.padding}
              onChange={(e) => onOptionChange('padding', parseInt(e.target.value))}
              disabled={isPacking}
              className="w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Espaciado entre imágenes en píxeles"
            />
            <div className="flex justify-between">
              <span className="num text-[10px] text-muted">0</span>
              <span className="num text-[10px] text-muted">50</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      {typeof totalImages === 'number' && totalImages > 0 && (
        <div className="border-t border-line pt-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="stat-tile">
              <p className="num text-base font-semibold text-fg">{totalImages}</p>
              <p className="eyebrow">Total</p>
            </div>
            <div className="stat-tile">
              <p className="num text-base font-semibold text-accent">{packedCount || 0}</p>
              <p className="eyebrow">Dentro</p>
            </div>
            <div className="stat-tile">
              <p className="num text-base font-semibold text-fg-soft">
                {totalImages - (packedCount || 0)}
              </p>
              <p className="eyebrow">Pendientes</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}