import { MaxRectsPacker, PACKING_LOGIC } from 'maxrects-packer';
import type {
  ImageFile,
  PackedImage,
  CanvasSize,
  PackingOptions,
  PackingResult,
  PackingStats,
  SortingStrategy,
  PackedPage
} from '../types';

// Unit conversion constants (300 DPI fixed)
export const DPI = 300;
export const CM_PER_INCH = 2.54;
export const PX_PER_CM = DPI / CM_PER_INCH; // 118.110236...

// Canvas size limits (in pixels)
export const MIN_CANVAS_PX = 100;
export const MAX_CANVAS_PX = Math.round(99 * PX_PER_CM); // 99 cm = 11693 px

// Canvas size limits (in cm, derived from px limits)
export const MIN_CANVAS_CM = Math.round((MIN_CANVAS_PX / PX_PER_CM) * 100) / 100; // 0.85 cm
export const MAX_CANVAS_CM = 99;

export type UnitType = 'px' | 'cm';

/**
 * Convert pixels to centimeters at 300 DPI
 */
export function pxToCm(px: number): number {
  return px / PX_PER_CM;
}

/**
 * Convert centimeters to pixels at 300 DPI
 */
export function cmToPx(cm: number): number {
  return cm * PX_PER_CM;
}

/**
 * Convert CanvasSize between units
 */
export function convertCanvasSize(size: CanvasSize, from: UnitType, to: UnitType): CanvasSize {
  if (from === to) return size;
  
  const convert = from === 'px' ? pxToCm : cmToPx;
  return {
    width: convert(size.width),
    height: convert(size.height),
  };
}

/**
 * Round to 2 decimal places for cm display
 */
export function roundCm(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Resolve an aspect ratio that is safe to sort on (no NaN, no division by zero).
 */
function safeAspectRatio(img: ImageFile): number {
  if (Number.isFinite(img.aspectRatio) && img.aspectRatio > 0) {
    return img.aspectRatio;
  }
  if (Number.isFinite(img.width) && Number.isFinite(img.height) && img.height > 0) {
    return img.width / img.height;
  }
  return 0;
}

/**
 * Sort images based on the selected strategy
 */
export function sortImages(images: ImageFile[], strategy: SortingStrategy): ImageFile[] {
  const sorted = [...images];
  
  switch (strategy) {
    case 'area-desc':
      return sorted.sort((a, b) => b.area - a.area);
    case 'area-asc':
      return sorted.sort((a, b) => a.area - b.area);
    case 'width-desc':
      return sorted.sort((a, b) => b.width - a.width);
    case 'height-desc':
      return sorted.sort((a, b) => b.height - a.height);
    case 'max-side-desc':
      return sorted.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
    case 'aspect-ratio':
      return sorted.sort((a, b) => safeAspectRatio(a) - safeAspectRatio(b));
    default:
      return sorted;
  }
}

function hasPositiveDimensions(img: ImageFile): boolean {
  return img.width > 0 && img.height > 0;
}

/**
 * Map our sorting strategy to maxrects-packer logic
 */
function getPackingLogic(strategy: SortingStrategy): number {
  switch (strategy) {
    case 'area-desc':
    case 'area-asc':
      return PACKING_LOGIC.MAX_AREA;
    case 'width-desc':
    case 'height-desc':
    case 'max-side-desc':
    default:
      return PACKING_LOGIC.MAX_EDGE;
  }
}

interface LayoutOutput {
  packed: PackedImage[];
  unpacked: ImageFile[];
}

/**
 * Mixed mode via MaxRectsPacker. The packer is given the inner area (canvas minus
 * the border gap on both axes) and every accepted rect is offset by the gap, so
 * the gap acts both between boxes and against the canvas edge. Rects larger than
 * the inner area are never handed to the packer (it would auto-grow the bin).
 */
function packMixed(
  images: ImageFile[],
  canvasWidth: number,
  canvasHeight: number,
  allowRotation: boolean,
  padding: number,
  sortingStrategy: SortingStrategy
): LayoutOutput {
  const gap = Math.max(0, padding);
  const innerWidth = canvasWidth - 2 * gap;
  const innerHeight = canvasHeight - 2 * gap;

  if (innerWidth <= 0 || innerHeight <= 0) {
    return { packed: [], unpacked: images };
  }

  const packer = new MaxRectsPacker(innerWidth, innerHeight, gap, {
    allowRotation,
    logic: getPackingLogic(sortingStrategy),
    smart: false,
    pot: false,
    square: false,
    border: 0,
  });

  const packed: PackedImage[] = [];
  const unpacked: ImageFile[] = [];

  for (const img of images) {
    const fitsNormal = img.width <= innerWidth && img.height <= innerHeight;
    const fitsRotated =
      allowRotation && img.height <= innerWidth && img.width <= innerHeight;

    if (!fitsNormal && !fitsRotated) {
      unpacked.push(img);
      continue;
    }

    packer.add({ width: img.width, height: img.height, data: { image: img } });

    const rect = packer.bins[0]?.rects.find((r) => r.data?.image?.id === img.id);

    const insideInnerArea =
      rect &&
      typeof rect.x === 'number' &&
      typeof rect.y === 'number' &&
      rect.x >= 0 &&
      rect.y >= 0 &&
      rect.x + rect.width <= innerWidth &&
      rect.y + rect.height <= innerHeight;

    if (!insideInnerArea) {
      unpacked.push(img);
      continue;
    }

    packed.push({
      ...img,
      x: Math.round(rect.x + gap),
      y: Math.round(rect.y + gap),
      rotated: rect.rot || false,
      displayWidth: Math.round(rect.width),
      displayHeight: Math.round(rect.height),
    });
  }

  return { packed, unpacked };
}

/**
 * Uniform / contact-sheet layout: a single native-sized cell (largest image) is
 * repeated across the sheet. No canvas division, no resizing. Images that cannot
 * fit a cell go to unpacked.
 */
function packUniform(
  images: ImageFile[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number
): LayoutOutput {
  if (images.length === 0) {
    return { packed: [], unpacked: [] };
  }

  const gap = Math.max(0, padding);

  // Images larger than what a cell can hold under the no-resize policy can never
  // be placed. Excluding them from the cell computation lets the remaining
  // photos still use a sensible cell size.
  const packable: ImageFile[] = [];
  const unpacked: ImageFile[] = [];
  for (const img of images) {
    if (img.width > canvasWidth - 2 * gap || img.height > canvasHeight - 2 * gap || img.width <= 0 || img.height <= 0) {
      unpacked.push(img);
    } else {
      packable.push(img);
    }
  }

  if (packable.length === 0) {
    return { packed: [], unpacked };
  }

  const cellWidth = Math.max(...packable.map((img) => img.width));
  const cellHeight = Math.max(...packable.map((img) => img.height));

  const cols = Math.max(1, Math.floor((canvasWidth - gap) / (cellWidth + gap)));
  const maxRows = Math.max(1, Math.floor((canvasHeight - gap) / (cellHeight + gap)));
  const capacity = cols * maxRows;

  const packed: PackedImage[] = [];

  for (let i = 0; i < packable.length; i++) {
    const img = packable[i];

    if (i >= capacity) {
      unpacked.push(img);
      continue;
    }

    const col = i % cols;
    const row = Math.floor(i / cols);
    if (row >= maxRows) {
      unpacked.push(img);
      continue;
    }

    const x = gap + col * (cellWidth + gap) + (cellWidth - img.width) / 2;
    const y = gap + row * (cellHeight + gap) + (cellHeight - img.height) / 2;

    packed.push({
      ...img,
      x: Math.round(x),
      y: Math.round(y),
      rotated: false,
      displayWidth: img.width,
      displayHeight: img.height,
    });
  }

  return { packed, unpacked };
}

/**
 * Columns layout: photos keep native size and stack inside a column with an exact
 * gap. A new column starts after the widest photo of the previous column plus the
 * gap. `columns` is a maximum, not a canvas divider.
 */
function packColumns(
  images: ImageFile[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number,
  columns: number,
  allowRotation: boolean
): LayoutOutput {
  const gap = Math.max(0, padding);
  const maxColumns = Math.floor(columns);

  if (images.length === 0) {
    return { packed: [], unpacked: [] };
  }
  if (!Number.isFinite(maxColumns) || maxColumns <= 0) {
    return { packed: [], unpacked: images };
  }

  const packed: PackedImage[] = [];
  const unpacked: ImageFile[] = [];

  let columnIndex = 0;
  let columnStart = gap;
  let cursorY = gap;
  let columnMaxWidth = 0;

  const fits = (w: number, h: number) =>
    columnStart + w <= canvasWidth - gap && cursorY + h <= canvasHeight - gap;

  for (const img of images) {
    let chosen: { width: number; height: number; rotated: boolean } | null = null;

    if (fits(img.width, img.height)) {
      chosen = { width: img.width, height: img.height, rotated: false };
    } else if (allowRotation && fits(img.height, img.width)) {
      chosen = { width: img.height, height: img.width, rotated: true };
    }

    // No room left in this column: open the next one (if allowed) and retry.
    while (!chosen && columnIndex + 1 < maxColumns) {
      columnStart = columnStart + columnMaxWidth + gap;
      cursorY = gap;
      columnMaxWidth = 0;
      columnIndex++;

      if (fits(img.width, img.height)) {
        chosen = { width: img.width, height: img.height, rotated: false };
      } else if (allowRotation && fits(img.height, img.width)) {
        chosen = { width: img.height, height: img.width, rotated: true };
      }
    }

    if (!chosen) {
      unpacked.push(img);
      continue;
    }

    packed.push({
      ...img,
      x: Math.round(columnStart),
      y: Math.round(cursorY),
      rotated: chosen.rotated,
      displayWidth: chosen.width,
      displayHeight: chosen.height,
    });

    columnMaxWidth = Math.max(columnMaxWidth, chosen.width);
    cursorY += chosen.height + gap;
  }

  return { packed, unpacked };
}

/**
 * Rows layout: symmetric to columns. Photos keep native size and advance
 * horizontally with an exact gap; a new row starts after the tallest photo of the
 * previous row plus the gap. `rows` is a maximum.
 */
function packRows(
  images: ImageFile[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number,
  rows: number,
  allowRotation: boolean
): LayoutOutput {
  const gap = Math.max(0, padding);
  const maxRows = Math.floor(rows);

  if (images.length === 0) {
    return { packed: [], unpacked: [] };
  }
  if (!Number.isFinite(maxRows) || maxRows <= 0) {
    return { packed: [], unpacked: images };
  }

  const packed: PackedImage[] = [];
  const unpacked: ImageFile[] = [];

  let rowIndex = 0;
  let rowStart = gap;
  let cursorX = gap;
  let rowMaxHeight = 0;

  const fits = (w: number, h: number) =>
    rowStart + h <= canvasHeight - gap && cursorX + w <= canvasWidth - gap;

  for (const img of images) {
    let chosen: { width: number; height: number; rotated: boolean } | null = null;

    if (fits(img.width, img.height)) {
      chosen = { width: img.width, height: img.height, rotated: false };
    } else if (allowRotation && fits(img.height, img.width)) {
      chosen = { width: img.height, height: img.width, rotated: true };
    }

    while (!chosen && rowIndex + 1 < maxRows) {
      rowStart = rowStart + rowMaxHeight + gap;
      cursorX = gap;
      rowMaxHeight = 0;
      rowIndex++;

      if (fits(img.width, img.height)) {
        chosen = { width: img.width, height: img.height, rotated: false };
      } else if (allowRotation && fits(img.height, img.width)) {
        chosen = { width: img.height, height: img.width, rotated: true };
      }
    }

    if (!chosen) {
      unpacked.push(img);
      continue;
    }

    packed.push({
      ...img,
      x: Math.round(cursorX),
      y: Math.round(rowStart),
      rotated: chosen.rotated,
      displayWidth: chosen.width,
      displayHeight: chosen.height,
    });

    rowMaxHeight = Math.max(rowMaxHeight, chosen.height);
    cursorX += chosen.width + gap;
  }

  return { packed, unpacked };
}

/**
 * Guillotine layout with a gap gutter. The root free rect sits inside the border
 * gap, and every split carves a right child and a bottom child offset by `gap`,
 * clipped to the parent. Children never overlap each other or earlier free rects.
 */
function packGuillotine(
  images: ImageFile[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number,
  allowRotation: boolean,
  sortingStrategy: SortingStrategy
): LayoutOutput {
  const gap = Math.max(0, padding);
  const sortedImages = sortImages(images, sortingStrategy);

  type FreeRect = { x: number; y: number; width: number; height: number };

  const rootWidth = canvasWidth - 2 * gap;
  const rootHeight = canvasHeight - 2 * gap;
  if (rootWidth <= 0 || rootHeight <= 0) {
    return { packed: [], unpacked: images };
  }

  const freeRects: FreeRect[] = [{ x: gap, y: gap, width: rootWidth, height: rootHeight }];
  const packed: PackedImage[] = [];
  const unpacked: ImageFile[] = [];

  function findBestRect(img: ImageFile): { rect: FreeRect; rotated: boolean; index: number } | null {
    let bestIndex = -1;
    let bestRect: FreeRect | null = null;
    let bestRotated = false;
    let bestScore = Infinity;

    for (let i = 0; i < freeRects.length; i++) {
      const fr = freeRects[i];

      if (img.width <= fr.width && img.height <= fr.height) {
        const score = Math.min(fr.width - img.width, fr.height - img.height);
        if (score < bestScore) {
          bestScore = score;
          bestIndex = i;
          bestRect = fr;
          bestRotated = false;
        }
      }

      if (allowRotation && img.height <= fr.width && img.width <= fr.height) {
        const score = Math.min(fr.width - img.height, fr.height - img.width);
        if (score < bestScore) {
          bestScore = score;
          bestIndex = i;
          bestRect = fr;
          bestRotated = true;
        }
      }
    }

    return bestRect ? { rect: bestRect, rotated: bestRotated, index: bestIndex } : null;
  }

  function splitFreeRect(freeRect: FreeRect, placedWidth: number, placedHeight: number): FreeRect[] {
    const children: FreeRect[] = [];

    // Right child: beside the placed box, across the placed height only.
    const rightX = freeRect.x + placedWidth + gap;
    const rightWidth = freeRect.x + freeRect.width - rightX;
    if (rightWidth > 0) {
      children.push({
        x: rightX,
        y: freeRect.y,
        width: rightWidth,
        height: placedHeight,
      });
    }

    // Bottom child: below the placed box, across the full parent width.
    const bottomY = freeRect.y + placedHeight + gap;
    const bottomHeight = freeRect.y + freeRect.height - bottomY;
    if (bottomHeight > 0) {
      children.push({
        x: freeRect.x,
        y: bottomY,
        width: freeRect.width,
        height: bottomHeight,
      });
    }

    return children;
  }

  for (const img of sortedImages) {
    const placement = findBestRect(img);

    if (!placement) {
      unpacked.push(img);
      continue;
    }

    const { rect, rotated, index } = placement;
    const w = rotated ? img.height : img.width;
    const h = rotated ? img.width : img.height;

    packed.push({
      ...img,
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      rotated,
      displayWidth: Math.round(w),
      displayHeight: Math.round(h),
    });

    freeRects.splice(index, 1);
    freeRects.push(...splitFreeRect(rect, w, h));
  }

  return { packed, unpacked };
}

/**
 * Shared layout dispatch. `packImages` and `packSinglePage` both go through this
 * so both always apply the same gap, canvas-size and no-resize rules.
 */
function dispatchLayout(images: ImageFile[], options: PackingOptions): LayoutOutput {
  const layoutMode = options.layoutMode || 'mixed';
  const padding = options.padding ?? 0;
  const canvasWidth = Math.round(options.canvasSize.width);
  const canvasHeight = Math.round(options.canvasSize.height);

  // Non-positive dimensions would produce NaN coordinates; treat as unpacked.
  const validImages: ImageFile[] = [];
  const invalidImages: ImageFile[] = [];
  for (const img of images) {
    if (hasPositiveDimensions(img)) {
      validImages.push(img);
    } else {
      invalidImages.push(img);
    }
  }

  let result: LayoutOutput;

  switch (layoutMode) {
    case 'uniform':
    case 'contact-sheet':
      result = packUniform(validImages, canvasWidth, canvasHeight, padding);
      break;
    case 'columns':
      result = packColumns(
        validImages,
        canvasWidth,
        canvasHeight,
        padding,
        options.columns ?? 4,
        options.allowRotation
      );
      break;
    case 'rows':
      result = packRows(
        validImages,
        canvasWidth,
        canvasHeight,
        padding,
        options.rows ?? 3,
        options.allowRotation
      );
      break;
    case 'guillotine':
      result = packGuillotine(
        validImages,
        canvasWidth,
        canvasHeight,
        padding,
        options.allowRotation,
        options.sortingStrategy
      );
      break;
    case 'mixed':
    default:
      result = packMixed(
        validImages,
        canvasWidth,
        canvasHeight,
        options.allowRotation,
        padding,
        options.sortingStrategy
      );
      break;
  }

  return { packed: result.packed, unpacked: [...result.unpacked, ...invalidImages] };
}

function requestedCanvasSize(options: PackingOptions): CanvasSize {
  return {
    width: Math.round(options.canvasSize.width),
    height: Math.round(options.canvasSize.height),
  };
}

function packedUsedArea(packed: PackedImage[]): number {
  return packed.reduce((sum, img) => sum + img.displayWidth * img.displayHeight, 0);
}

/**
 * Main packing dispatcher
 */
export function packImages(
  images: ImageFile[],
  options: PackingOptions
): PackingResult {
  const canvasSize = requestedCanvasSize(options);
  const canvasArea = canvasSize.width * canvasSize.height;
  const layoutMode = options.layoutMode || 'mixed';

  if (images.length === 0) {
    return {
      packedImages: [],
      canvasSize,
      efficiency: 0,
      unusedImages: [],
      stats: {
        totalImages: 0,
        packedCount: 0,
        unpackedCount: 0,
        totalArea: 0,
        usedArea: 0,
        efficiency: 0,
        canvasArea,
      },
      layoutMode,
    };
  }

  const sortedImages = sortImages(images, options.sortingStrategy);
  const { packed, unpacked } = dispatchLayout(sortedImages, options);

  const totalArea = images.reduce((sum, img) => sum + img.area, 0);
  const usedArea = packedUsedArea(packed);
  const efficiency = canvasArea > 0 ? (usedArea / canvasArea) * 100 : 0;

  const stats: PackingStats = {
    totalImages: images.length,
    packedCount: packed.length,
    unpackedCount: unpacked.length,
    totalArea,
    usedArea,
    efficiency,
    canvasArea,
  };

  return {
    packedImages: packed,
    canvasSize,
    efficiency,
    unusedImages: unpacked,
    stats,
    layoutMode,
  };
}

interface SinglePageResult {
  packed: PackedImage[];
  unpacked: ImageFile[];
  canvasSize: CanvasSize;
  efficiency: number;
}

/**
 * Pack a single page with the given images. The canvas size is always the
 * requested size.
 */
function packSinglePage(images: ImageFile[], options: PackingOptions): SinglePageResult {
  const canvasSize = requestedCanvasSize(options);
  const sortedImages = sortImages(images, options.sortingStrategy);
  const { packed, unpacked } = dispatchLayout(sortedImages, options);

  const canvasArea = canvasSize.width * canvasSize.height;
  const usedArea = packedUsedArea(packed);
  const efficiency = canvasArea > 0 ? (usedArea / canvasArea) * 100 : 0;

  return { packed, unpacked, canvasSize, efficiency };
}

/**
 * Multi-page packing: distributes images across multiple canvases when they don't fit in one
 */
export function packImagesMultiPage(
  images: ImageFile[],
  options: PackingOptions,
  maxPages: number = 10
): PackingResult {
  const canvasSize = requestedCanvasSize(options);
  const canvasArea = canvasSize.width * canvasSize.height;
  const layoutMode = options.layoutMode || 'mixed';

  if (images.length === 0) {
    return {
      packedImages: [],
      canvasSize,
      efficiency: 0,
      unusedImages: [],
      stats: {
        totalImages: 0,
        packedCount: 0,
        unpackedCount: 0,
        totalArea: 0,
        usedArea: 0,
        efficiency: 0,
        canvasArea,
      },
      layoutMode,
      pages: [],
      totalPages: 0,
      isMultiPage: false,
    };
  }

  const sortedImages = sortImages(images, options.sortingStrategy);

  let remainingImages = sortedImages;
  const allPages: PackedPage[] = [];
  let pageNumber = 1;
  const maxPagesLimit = Number.isFinite(maxPages) ? maxPages : 10;

  const baseOptions: PackingOptions = { ...options };

  while (remainingImages.length > 0 && pageNumber <= maxPagesLimit) {
    const singlePageResult = packSinglePage(remainingImages, baseOptions);

    // If no images were packed on this page, break to avoid infinite loop
    if (singlePageResult.packed.length === 0) {
      break;
    }

    allPages.push({
      images: singlePageResult.packed,
      canvasSize: singlePageResult.canvasSize,
      efficiency: singlePageResult.efficiency,
      pageNumber,
    });

    remainingImages = singlePageResult.unpacked;
    pageNumber++;
  }

  const unusedImages = remainingImages;

  const allPackedImages = allPages.flatMap((page) => page.images);
  const totalArea = images.reduce((sum, img) => sum + img.area, 0);
  const usedArea = packedUsedArea(allPackedImages);

  // Every page has the requested canvas size, so the overall canvas area is a
  // simple multiple of it.
  const totalCanvasArea = allPages.length * canvasArea;
  const overallEfficiency = totalCanvasArea > 0 ? (usedArea / totalCanvasArea) * 100 : 0;

  const stats: PackingStats = {
    totalImages: images.length,
    packedCount: allPackedImages.length,
    unpackedCount: unusedImages.length,
    totalArea,
    usedArea,
    efficiency: overallEfficiency,
    canvasArea: totalCanvasArea,
  };

  return {
    packedImages: allPackedImages,
    canvasSize: allPages[0]?.canvasSize ?? canvasSize,
    efficiency: overallEfficiency,
    unusedImages,
    stats,
    layoutMode,
    pages: allPages,
    totalPages: allPages.length,
    isMultiPage: allPages.length > 1,
  };
}

/**
 * Calculate the best canvas size for the given images
 */
export function calculateOptimalCanvasSize(images: ImageFile[]): CanvasSize {
  if (images.length === 0) {
    return { width: 800, height: 600 };
  }

  const totalArea = images.reduce((sum, img) => sum + img.area, 0);
  const estimatedArea = totalArea * 1.4;
  const side = Math.sqrt(estimatedArea);
  
  const width = Math.ceil(side / 100) * 100;
  const height = Math.ceil(side / 100) * 100;
  
  return { width: Math.max(width, 400), height: Math.max(height, 300) };
}

/**
 * Generate a unique ID for an image
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create ImageFile object from File
 */
export async function createImageFile(file: File): Promise<ImageFile> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      // Do NOT revoke the URL here - it needs to persist for export
      // The URL will be revoked when the image is removed/cleared
      resolve({
        id: generateId(),
        file,
        preview: url,
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
        area: img.naturalWidth * img.naturalHeight,
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    
    img.src = url;
  });
}

export function revokeImageFileURLs(imageFiles: ImageFile[]): void {
  imageFiles.forEach(imageFile => {
    if (imageFile.preview && imageFile.preview.startsWith('blob:')) {
      URL.revokeObjectURL(imageFile.preview);
    }
  });
}

/**
 * Download packed result as image - delegates to ./export for unified API
 * @deprecated Use drawPackedCanvas/downloadPackedCanvas from ./export instead
 */
export async function downloadPackedCanvas(
  packedImages: PackedImage[],
  canvasSize: CanvasSize,
  backgroundColor: string = '#ffffff'
): Promise<void> {
  // Draw canvas using export logic
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas 2d context');
  }

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

  // Draw each packed image (contain mode)
  const drawPromises = packedImages.map(packedImg => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          // displayWidth/displayHeight are already swapped for rotated photos,
          // so draw with the unswapped native box and rotate about the center.
          const drawnWidth = packedImg.rotated ? packedImg.displayHeight : packedImg.displayWidth;
          const drawnHeight = packedImg.rotated ? packedImg.displayWidth : packedImg.displayHeight;

          ctx.save();
          ctx.translate(packedImg.x + packedImg.displayWidth / 2, packedImg.y + packedImg.displayHeight / 2);
          if (packedImg.rotated) {
            ctx.rotate(Math.PI / 2);
          }
          ctx.drawImage(
            img,
            -drawnWidth / 2,
            -drawnHeight / 2,
            drawnWidth,
            drawnHeight
          );
          ctx.restore();
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${packedImg.id}`));
      img.src = packedImg.preview;
    });
  });

  await Promise.all(drawPromises);
  
  // Trigger download
  const link = document.createElement('a');
  link.download = `packed-images-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}