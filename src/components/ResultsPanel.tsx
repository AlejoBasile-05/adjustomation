import { cn } from '../utils/cn';
import { Download, AlertTriangle, Sparkles, ChevronRight } from 'lucide-react';
import type { PackingResult } from '../types';

interface ResultsPanelProps {
  result: PackingResult | null;
  onDownload: () => void;
  isPacking?: boolean;
}

const TIPS = [
  <>Usa <strong className="font-semibold text-fg-soft">Área descendente</strong> para la mayoría de casos</>,
  <>Activa la <strong className="font-semibold text-fg-soft">rotación</strong> para ganar ~15-30% de aprovechamiento</>,
  <>Reduce el <strong className="font-semibold text-fg-soft">espaciado</strong> si no necesitas márgenes</>,
  <>Aumenta el <strong className="font-semibold text-fg-soft">lienzo</strong> si hay imágenes sin colocar</>,
  <>Con imágenes muy dispares prueba <strong className="font-semibold text-fg-soft">Lado mayor descendente</strong></>,
];

export function ResultsPanel({ result, onDownload, isPacking }: ResultsPanelProps) {
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-control border border-dashed border-line-strong bg-raised text-muted">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="font-display text-sm font-semibold text-fg-soft">Sin resultados todavía</p>
          <p className="max-w-[34ch] text-xs text-muted">
            Configura el lienzo y pulsa <strong className="font-semibold text-fg-soft">Empaquetar</strong> para ver la eficiencia.
          </p>
        </div>
      </div>
    );
  }

  const { stats, efficiency, unusedImages, canvasSize } = result;
  const tier = efficiency >= 70 ? 'ok' : efficiency >= 50 ? 'warn' : 'danger';
  const usedPercent = stats.canvasArea > 0 ? (stats.usedArea / stats.canvasArea) * 100 : 0;

  const verdict =
    tier === 'ok'
      ? 'Excelente aprovechamiento'
      : tier === 'warn'
        ? 'Aprovechamiento aceptable'
        : 'Espacio desaprovechado';

  const circumference = 2 * Math.PI * 50;

  return (
    <div className="space-y-4 p-4">
      {/* Efficiency gauge */}
      <div className="flex items-center gap-4">
        <div className="relative h-[104px] w-[104px] shrink-0">
          <svg viewBox="0 0 112 112" className="h-full w-full" aria-hidden="true">
            <circle
              cx="56"
              cy="56"
              r="50"
              fill="none"
              stroke="var(--app-line-strong)"
              strokeWidth="7"
            />
            <circle
              cx="56"
              cy="56"
              r="50"
              fill="none"
              stroke={
                tier === 'ok' ? 'var(--app-ok)' : tier === 'warn' ? 'var(--app-warn)' : 'var(--app-danger)'
              }
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (Math.min(efficiency, 100) / 100) * circumference}
              transform="rotate(-90 56 56)"
              style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="num text-xl font-semibold leading-none text-fg">
              {efficiency.toFixed(1)}%
            </span>
            <span className="eyebrow mt-1 text-[9px]">Eficiencia</span>
          </div>
        </div>

        <div className="min-w-0 space-y-1">
          <p
            className={cn(
              'text-sm font-semibold leading-snug',
              tier === 'ok' ? 'text-ok' : tier === 'warn' ? 'text-warn' : 'text-danger'
            )}
          >
            {verdict}
          </p>
          <p className="text-xs leading-relaxed text-muted">
            de <span className="num text-fg-soft">{stats.canvasArea.toLocaleString()}</span> px² disponibles
          </p>
          <p className="num text-[11px] text-muted">
            {stats.packedCount} de {stats.totalImages} piezas colocadas
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="stat-tile">
          <p className="num text-base font-semibold text-accent">{stats.packedCount}</p>
          <p className="eyebrow">Colocadas</p>
        </div>
        <div className="stat-tile">
          <p
            className={cn(
              'num text-base font-semibold',
              stats.unpackedCount > 0 ? 'text-danger' : 'text-muted'
            )}
          >
            {stats.unpackedCount}
          </p>
          <p className="eyebrow">Fuera</p>
        </div>
        <div className="stat-tile">
          <p className="num text-base font-semibold text-fg">{usedPercent.toFixed(1)}%</p>
          <p className="eyebrow">Área usada</p>
        </div>
      </div>

      {/* Canvas readout */}
      <div className="grid grid-cols-2 gap-3 rounded-control border border-line bg-sunken px-3 py-2.5">
        <div>
          <p className="eyebrow">Lienzo</p>
          <p className="num text-sm text-fg">
            {canvasSize.width} × {canvasSize.height}
          </p>
        </div>
        <div>
          <p className="eyebrow">Área</p>
          <p className="num text-sm text-fg">{stats.canvasArea.toLocaleString()} px²</p>
        </div>
      </div>

      {/* Unpacked warning */}
      {unusedImages.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-control border border-warn/40 bg-warn-soft px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-warn">
              {unusedImages.length} imagen{unusedImages.length !== 1 ? 'es' : ''} no caben
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-warn/90">
              Aumenta el tamaño del lienzo o reduce el espaciado para incluirlas.
            </p>
          </div>
        </div>
      )}

      {/* Download */}
      <button
        type="button"
        onClick={onDownload}
        disabled={isPacking || stats.packedCount === 0}
        className="btn btn-primary w-full gap-2 py-2.5"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Descargar resultado (PNG)
      </button>

      {/* Tips */}
      <details className="group border-t border-line pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-fg">
          <ChevronRight
            className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
          Consejos para mejor empaquetado
        </summary>
        <ul className="mt-2.5 list-disc space-y-1.5 pl-4 text-[11px] leading-relaxed text-muted">
          {TIPS.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
