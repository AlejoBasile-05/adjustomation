export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  width: number;
  height: number;
  aspectRatio: number;
  area: number;
}

export interface PackedImage extends ImageFile {
  x: number;
  y: number;
  rotated: boolean;
  displayWidth: number;
  displayHeight: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface PackingOptions {
  canvasSize: CanvasSize;
  allowRotation: boolean;
  padding: number;
  sortingStrategy: SortingStrategy;
}

export type SortingStrategy = 
  | 'area-desc'      // Área descendente (más grandes primero)
  | 'area-asc'       // Área ascendente (más pequeñas primero)
  | 'width-desc'     // Ancho descendente
  | 'height-desc'    // Alto descendente
  | 'max-side-desc'  // Lado máximo descendente
  | 'aspect-ratio';  // Por aspect ratio

export interface PackingResult {
  packedImages: PackedImage[];
  canvasSize: CanvasSize;
  efficiency: number;        // Porcentaje de espacio usado
  unusedImages: ImageFile[]; // Imágenes que no cabieron
  stats: PackingStats;
}

export interface PackingStats {
  totalImages: number;
  packedCount: number;
  unpackedCount: number;
  totalArea: number;
  usedArea: number;
  efficiency: number;
  canvasArea: number;
}

export interface AppState {
  images: ImageFile[];
  canvasSize: CanvasSize;
  options: PackingOptions;
  result: PackingResult | null;
  isProcessing: boolean;
  error: string | null;
}