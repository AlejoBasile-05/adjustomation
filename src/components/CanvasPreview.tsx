import type { PackedImage, CanvasSize } from '../types';

interface CanvasPreviewProps {
  packedImages: PackedImage[];
  canvasSize: CanvasSize;
  padding: number;
  showGrid?: boolean;
  backgroundColor?: string;
}

export function CanvasPreview({ 
  packedImages, 
  canvasSize, 
  padding, 
  showGrid = true,
  backgroundColor = '#ffffff'
}: CanvasPreviewProps) {
  // Calculate scale to fit in container
  const containerWidth = 720; // max width
  const containerHeight = 540; // max height
  const scale = Math.min(
    containerWidth / canvasSize.width,
    containerHeight / canvasSize.height,
    1
  );
  
  const displayWidth = canvasSize.width * scale;
  const displayHeight = canvasSize.height * scale;

  if (packedImages.length === 0) {
    return (
      <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[300px]">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <p className="text-lg font-medium">No hay imágenes empaquetadas</p>
          <p className="text-sm mt-1">Ejecuta el empaquetado para ver el resultado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="relative" style={{ width: displayWidth, height: displayHeight }}>
        {/* Canvas background */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor }}
        />
        
        {/* Grid overlay */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)
            `,
            backgroundSize: `${50 * scale}px ${50 * scale}px`,
          }} />
        )}
        
        {/* Packed images */}
        {packedImages.map((img) => (
          <div
            key={img.id}
            className="absolute"
            style={{
              left: img.x * scale,
              top: img.y * scale,
              width: img.displayWidth * scale,
              height: img.displayHeight * scale,
              transform: img.rotated ? 'rotate(90deg)' : 'none',
              transformOrigin: 'top left',
            }}
          >
            <img
              src={img.preview}
              alt={img.file.name}
              className="w-full h-full object-cover"
              style={{
                imageRendering: 'crisp-edges',
              }}
            />
            {/* Padding visualization */}
            {padding > 0 && (
              <div className="absolute inset-0 border border-slate-300/50 dark:border-slate-600/50 pointer-events-none" 
                style={{ 
                  margin: -padding * scale,
                  borderWidth: `${Math.max(1, padding * scale)}px`,
                }}
              />
            )}
          </div>
        ))}
        
        {/* Canvas border */}
        <div className="absolute inset-0 border-2 border-slate-400/50 dark:border-slate-500/50 pointer-events-none" />
      </div>
      
      {/* Dimensions overlay */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        {canvasSize.width} × {canvasSize.height} px
      </div>
    </div>
  );
}