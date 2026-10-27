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
  // For uniform/cover modes - source rectangle for cropping
  sourceRect?: { sx: number; sy: number; sw: number; sh: number };
}

export interface CanvasSize {
  width: number;
  height: number;
}

export type UnitType = 'px' | 'cm';

export interface PackingOptions {
  canvasSize: CanvasSize;
  allowRotation: boolean;
  padding: number;
  sortingStrategy: SortingStrategy;
  layoutMode: LayoutMode;
  // Layout-specific options
  columns?: number;        // For 'columns' mode
  rows?: number;           // For 'rows' mode
  cellPadding?: number;    // For uniform/contact-sheet
  fitMode?: 'contain' | 'cover'; // For uniform/contact-sheet
  unit?: UnitType;
}

export type SortingStrategy = 
  | 'area-desc'      // Área descendente (más grandes primero)
  | 'area-asc'       // Área ascendente (más pequeñas primero)
  | 'width-desc'     // Ancho descendente
  | 'height-desc'    // Alto descendente
  | 'max-side-desc'  // Lado máximo descendente
  | 'aspect-ratio';  // Por aspect ratio

export type LayoutMode = 
  | 'uniform'        // Fotos del mismo tamaño (grid uniforme)
  | 'mixed'          // Fotos de diferente tamaño (MaxRects)
  | 'columns'        // Agrupación por columnas
  | 'rows'           // Agrupación por filas
  | 'guillotine'     // Algoritmo Guillotina (cortes guillotina)
  | 'contact-sheet'; // Hoja de contactos (grid uniforme con metadata)

export interface PackingResult {
  packedImages: PackedImage[];
  canvasSize: CanvasSize;
  efficiency: number;        // Porcentaje de espacio usado
  unusedImages: ImageFile[]; // Imágenes que no cabieron
  stats: PackingStats;
  layoutMode: LayoutMode;    // Modo de layout utilizado
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