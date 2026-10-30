import { cn } from '../utils/cn';
import { Minus, Plus, Grid, Layers, Sparkles, Maximize2, LayoutGrid, Columns, Rows, Scissors, FileText } from 'lucide-react';
import type { PackingOptions, SortingStrategy, CanvasSize, LayoutMode, UnitType } from '../types';
import { roundCm, pxToCm, cmToPx, MIN_CANVAS_PX, MAX_CANVAS_PX, MIN_CANVAS_CM, MAX_CANVAS_CM } from '../utils/packing';
import { useMemo } from 'react';

interface SettingsPanelProps {
  options: PackingOptions;
  onOptionChange: <K extends keyof PackingOptions>(key: K, value: PackingOptions[K]) => void;
  onCanvasSizeChange: (size: CanvasSize) => void;
  onUnitChange: (unit: UnitType) => void;
  isPacking?: boolean;
  packedCount?: number;
  totalImages?: number;
  useMultiPage?: boolean;
  maxPages?: number;
  onUseMultiPageChange?: (use: boolean) => void;
  onMaxPagesChange?: (pages: number) => void;
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

const layoutModes: { value: LayoutMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'mixed',
    label: 'Fotos de diferente tamaño',
    description: 'MaxRects automático (óptimo para mixtas)',
    icon: <Layers className="w-4 h-4" />
  },
  {
    value: 'uniform',
    label: 'Fotos del mismo tamaño',
    description: 'Grid uniforme (ideal para miniaturas)',
    icon: <LayoutGrid className="w-4 h-4" />
  },
  {
    value: 'columns',
    label: 'Agrupación por columnas',
    description: 'Columnas fijas, altura variable',
    icon: <Columns className="w-4 h-4" />
  },
  {
    value: 'rows',
    label: 'Agrupación por filas',
    description: 'Filas fijas, ancho variable',
    icon: <Rows className="w-4 h-4" />
  },
  {
    value: 'guillotine',
    label: 'Algoritmo Guillotina',
    description: 'Cortes guillotina (para cortes físicos)',
    icon: <Scissors className="w-4 h-4" />
  },
  {
    value: 'contact-sheet',
    label: 'Hoja de contactos',
    description: 'Grid uniforme con metadatos',
    icon: <FileText className="w-4 h-4" />
  },
];

export function SettingsPanel({
  options,
  onOptionChange,
  onCanvasSizeChange,
  onUnitChange,
  isPacking,
  packedCount,
  totalImages,
  useMultiPage,
  maxPages,
  onUseMultiPageChange,
  onMaxPagesChange,
}: SettingsPanelProps) {
  const currentUnit = options.unit || 'px';
  
  const { displayWidth, displayHeight, displayArea, minValue, maxValue, stepValue } = useMemo(() => {
    if (currentUnit === 'px') {
      return {
        displayWidth: options.canvasSize.width,
        displayHeight: options.canvasSize.height,
        displayArea: `${(options.canvasSize.width * options.canvasSize.height).toLocaleString()} px²`,
        minValue: MIN_CANVAS_PX,
        maxValue: MAX_CANVAS_PX,
        stepValue: 1,
      };
    } else {
      const widthCm = roundCm(pxToCm(options.canvasSize.width));
      const heightCm = roundCm(pxToCm(options.canvasSize.height));
      const areaCm = roundCm(pxToCm(Math.sqrt(options.canvasSize.width * options.canvasSize.height)));
      return {
        displayWidth: widthCm,
        displayHeight: heightCm,
        displayArea: `${areaCm} cm²`,
        minValue: MIN_CANVAS_CM,
        maxValue: MAX_CANVAS_CM,
        stepValue: 0.1,
      };
    }
  }, [currentUnit, options.canvasSize.width, options.canvasSize.height]);

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseFloat(e.target.value);
    if (isNaN(rawValue)) return;
    
    let value: number;
    if (currentUnit === 'px') {
      value = Math.max(MIN_CANVAS_PX, Math.min(MAX_CANVAS_PX, Math.round(rawValue)));
    } else {
      // Convert cm to px internally
      value = Math.max(MIN_CANVAS_PX, Math.min(MAX_CANVAS_PX, Math.round(cmToPx(rawValue))));
    }
    onCanvasSizeChange({ ...options.canvasSize, width: value });
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseFloat(e.target.value);
    if (isNaN(rawValue)) return;
    
    let value: number;
    if (currentUnit === 'px') {
      value = Math.max(MIN_CANVAS_PX, Math.min(MAX_CANVAS_PX, Math.round(rawValue)));
    } else {
      // Convert cm to px internally
      value = Math.max(MIN_CANVAS_PX, Math.min(MAX_CANVAS_PX, Math.round(cmToPx(rawValue))));
    }
    onCanvasSizeChange({ ...options.canvasSize, height: value });
  };

  const handleUnitChange = (newUnit: UnitType) => {
    if (newUnit !== currentUnit) {
      onUnitChange(newUnit);
    }
  };

  return (
    <div className="p-4 space-y-5">
      {/* Canvas Size */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="eyebrow">Tamaño del lienzo</span>
          <span className="num text-[11px] text-muted">
            {displayArea}
          </span>
        </div>
        
        {/* Unit Toggle */}
        <div className="mb-2 flex gap-1">
          <button
            type="button"
            onClick={() => handleUnitChange('px')}
            disabled={isPacking}
            aria-pressed={currentUnit === 'px'}
            className={cn(
              'flex-1 rounded-control border px-2 py-1.5 text-xs font-medium transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              currentUnit === 'px'
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-line bg-raised hover:border-line-strong text-fg-soft'
            )}
          >
            px
          </button>
          <button
            type="button"
            onClick={() => handleUnitChange('cm')}
            disabled={isPacking}
            aria-pressed={currentUnit === 'cm'}
            className={cn(
              'flex-1 rounded-control border px-2 py-1.5 text-xs font-medium transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              currentUnit === 'cm'
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-line bg-raised hover:border-line-strong text-fg-soft'
            )}
          >
            cm
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="canvas-width" className="mb-1 block text-[10px] text-muted">
              Ancho ({currentUnit})
            </label>
            <div className="relative">
              <input
                id="canvas-width"
                type="number"
                value={displayWidth}
                onChange={handleWidthChange}
                disabled={isPacking}
                className="field pr-7"
                min={minValue}
                max={maxValue}
                step={stepValue}
                aria-label={`Ancho del lienzo en ${currentUnit === 'px' ? 'píxeles' : 'centímetros'}`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-muted">
                {currentUnit}
              </span>
            </div>
          </div>
          <div>
            <label htmlFor="canvas-height" className="mb-1 block text-[10px] text-muted">
              Alto ({currentUnit})
            </label>
            <div className="relative">
              <input
                id="canvas-height"
                type="number"
                value={displayHeight}
                onChange={handleHeightChange}
                disabled={isPacking}
                className="field pr-7"
                min={minValue}
                max={maxValue}
                step={stepValue}
                aria-label={`Alto del lienzo en ${currentUnit === 'px' ? 'píxeles' : 'centímetros'}`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-muted">
                {currentUnit}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-muted">
          {currentUnit === 'px'
            ? 'El tamaño del lienzo se mantiene fijo. Las imágenes que no quepan se notifican como no colocadas.'
            : 'DPI fijo: 300. 1 pulgada = 2.54 cm. Se convierte automáticamente a píxeles.'}
        </p>
      </div>

      <div className="border-t border-line pt-4">
        <span className="eyebrow">Modo de empaquetado</span>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {layoutModes.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => onOptionChange('layoutMode', mode.value)}
              disabled={isPacking}
              aria-pressed={options.layoutMode === mode.value}
              className={cn(
                'rounded-control border p-2.5 text-left transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-50',
                options.layoutMode === mode.value
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-raised hover:border-line-strong'
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={cn(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-[8px]',
                    options.layoutMode === mode.value
                      ? 'bg-accent text-accent-fg'
                      : 'bg-sunken text-muted'
                  )}
                >
                  {mode.icon}
                </span>
                <span
                  className={cn(
                    'truncate text-xs font-semibold',
                    options.layoutMode === mode.value ? 'text-fg' : 'text-fg-soft'
                  )}
                >
                  {mode.label}
                </span>
              </div>
              <p className="text-[10px] leading-snug text-muted">{mode.description}</p>
            </button>
          ))}
        </div>
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

          {/* Layout-specific options */}
          {options.layoutMode === 'columns' && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="layout-columns" className="text-[10px] text-muted">
                  Número de columnas
                </label>
                <span className="chip">
                  <span className="num">{options.columns || 4}</span>
                </span>
              </div>
              <input
                id="layout-columns"
                type="range"
                min={1}
                max={12}
                value={options.columns || 4}
                onChange={(e) => onOptionChange('columns', parseInt(e.target.value))}
                disabled={isPacking}
                className="w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Número de columnas"
              />
              <div className="flex justify-between">
                <span className="num text-[10px] text-muted">1</span>
                <span className="num text-[10px] text-muted">12</span>
              </div>
            </div>
          )}

          {options.layoutMode === 'rows' && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="layout-rows" className="text-[10px] text-muted">
                  Número de filas
                </label>
                <span className="chip">
                  <span className="num">{options.rows || 3}</span>
                </span>
              </div>
              <input
                id="layout-rows"
                type="range"
                min={1}
                max={12}
                value={options.rows || 3}
                onChange={(e) => onOptionChange('rows', parseInt(e.target.value))}
                disabled={isPacking}
                className="w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Número de filas"
              />
              <div className="flex justify-between">
                <span className="num text-[10px] text-muted">1</span>
                <span className="num text-[10px] text-muted">12</span>
              </div>
            </div>
          )}

          {(['uniform', 'contact-sheet'].includes(options.layoutMode)) && (
            <>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="cell-padding" className="text-[10px] text-muted">
                    Espaciado entre celdas
                  </label>
                  <span className="chip">
                    <span className="num">{options.cellPadding || 4}</span> px
                  </span>
                </div>
                <input
                  id="cell-padding"
                  type="range"
                  min={0}
                  max={50}
                  value={options.cellPadding || 4}
                  onChange={(e) => onOptionChange('cellPadding', parseInt(e.target.value))}
                  disabled={isPacking}
                  className="w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Espaciado entre celdas en píxeles"
                />
                <div className="flex justify-between">
                  <span className="num text-[10px] text-muted">0</span>
                  <span className="num text-[10px] text-muted">50</span>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="fit-mode" className="text-[10px] text-muted">
                    Modo de ajuste
                  </label>
                  <span className="chip">
                    {options.fitMode || 'contain'}
                  </span>
                </div>
                <select
                  id="fit-mode"
                  value={options.fitMode || 'contain'}
                  onChange={(e) => onOptionChange('fitMode', e.target.value as 'contain' | 'cover')}
                  disabled={isPacking}
                  className="w-full field text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Modo de ajuste de imagen en celda"
                >
                  <option value="contain">Contener (ver imagen completa)</option>
                  <option value="cover">Cubrir (recortar para llenar)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="canvas-padding" className="text-[10px] text-muted">
                Espaciado (borde)
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

      {/* Multi-page options */}
      <div className="border-t border-line pt-4">
        <span className="eyebrow">Empaquetado multi-página</span>
        <div className="mt-2 space-y-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-control border border-line bg-raised px-3 py-2.5">
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={useMultiPage || false}
                onChange={(e) => onUseMultiPageChange?.(e.target.checked)}
                disabled={isPacking}
                className={cn(
                  'h-4 w-4 rounded accent-[var(--app-accent)]',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
              <span className="text-sm text-fg">Crear múltiples páginas automáticamente</span>
            </span>
            <span className="hidden text-[10px] text-muted sm:block">Cuando las imágenes no quepan, crea nuevas páginas</span>
          </label>

          {useMultiPage && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="max-pages" className="text-[10px] text-muted">
                  Máximo de páginas
                </label>
                <span className="chip">
                  <span className="num">{maxPages || 10}</span>
                </span>
              </div>
              <input
                id="max-pages"
                type="range"
                min={1}
                max={100}
                value={maxPages || 10}
                onChange={(e) => onMaxPagesChange?.(parseInt(e.target.value))}
                disabled={isPacking}
                className="w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Máximo número de páginas"
              />
              <div className="flex justify-between">
                <span className="num text-[10px] text-muted">1</span>
                <span className="num text-[10px] text-muted">100</span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted">
                Las imágenes que no quepan en el máximo de páginas se marcarán como no colocadas.
              </p>
            </div>
          )}
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