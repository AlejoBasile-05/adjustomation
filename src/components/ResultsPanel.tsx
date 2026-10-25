import { cn } from '../utils/cn';
import { Download, CheckCircle, AlertTriangle, Info, RotateCw, Expand } from 'lucide-react';
import type { PackingResult } from '../types';

interface ResultsPanelProps {
  result: PackingResult | null;
  onDownload: () => void;
  isPacking?: boolean;
}

export function ResultsPanel({ result, onDownload, isPacking }: ResultsPanelProps) {
  if (!result) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 text-center">
        <Info className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-slate-400">
          Configura las opciones y haz clic en <strong className="text-slate-700 dark:text-slate-300">"Empaquetar"</strong> para ver los resultados
        </p>
      </div>
    );
  }

  const { stats, efficiency, unusedImages, canvasSize } = result;
  const isEfficient = efficiency >= 70;
  const isModerate = efficiency >= 50;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
      {/* Efficiency Header */}
      <div className={cn(
        'rounded-xl p-4 text-center',
        isEfficient ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
        isModerate ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' :
        'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
      )}>
        <div className="flex items-center justify-center gap-2 mb-2">
          {isEfficient ? (
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          ) : isModerate ? (
            <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          )}
          <span className={cn(
            'text-2xl font-bold',
            isEfficient ? 'text-green-700 dark:text-green-300' :
            isModerate ? 'text-yellow-700 dark:text-yellow-300' :
            'text-red-700 dark:text-red-300'
          )}>
            {efficiency.toFixed(1)}%
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Eficiencia de empaquetado
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Imágenes colocadas"
          value={stats.packedCount}
          icon={<CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />}
        />
        <StatCard
          label="Sin colocar"
          value={stats.unpackedCount}
          icon={<AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
        />
        <StatCard
          label="Área usada"
          value={`${((stats.usedArea / stats.canvasArea) * 100).toFixed(1)}%`}
          icon={<Expand className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
        />
      </div>

      {/* Canvas Info */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Lienzo</p>
          <p className="font-mono text-lg font-semibold text-slate-900 dark:text-slate-100">
            {canvasSize.width} × {canvasSize.height}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Área total</p>
          <p className="font-mono text-lg font-semibold text-slate-900 dark:text-slate-100">
            {stats.canvasArea.toLocaleString()} px²
          </p>
        </div>
      </div>

      {/* Unpacked images warning */}
      {unusedImages.length > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {unusedImages.length} imagen{unusedImages.length !== 1 ? 'es' : ''} no cabieron
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Aumenta el tamaño del lienzo o reduce el espaciado para incluirlas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Download button */}
      <button
        onClick={onDownload}
        disabled={isPacking || stats.packedCount === 0}
        className={cn(
          'w-full py-3 px-4 rounded-lg font-medium transition-all',
          'flex items-center justify-center gap-2',
          stats.packedCount > 0
            ? 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800'
            : 'bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-600 dark:text-slate-400'
        )}
      >
        <Download className="w-5 h-5" />
        Descargar resultado (PNG)
      </button>

      {/* Tips */}
      <details className="group">
        <summary className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 cursor-pointer">
          <span className="transition-transform group-open:rotate-90">
            <RotateCw className="w-4 h-4" />
          </span>
          Consejos para mejor empaquetado
        </summary>
        <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400 pl-6 list-disc">
          <li>Usa <strong>"Área descendente"</strong> para la mayoría de casos</li>
          <li>Activa <strong>rotación</strong> para mejorar aprovechamiento ~15-30%</li>
          <li>Reduce el <strong>espaciado</strong> si no necesitas márgenes</li>
          <li>Aumenta el lienzo si hay imágenes sin colocar</li>
          <li>Para imágenes muy diferentes, prueba <strong>"Lado mayor descendente"</strong></li>
        </ul>
      </details>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}