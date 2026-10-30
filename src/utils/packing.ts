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
      return sorted.sort((a, b) => a.aspectRatio - b.aspectRatio);
    default:
      return sorted;
  }
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

/**
 * Try to pack images into a canvas using MaxRectsPacker (mixed mode)
 */
function tryPackMixed(
  images: ImageFile[],
  canvasWidth: number,
  canvasHeight: number,
  allowRotation: boolean,
  padding: number,
  sortingStrategy: SortingStrategy
): { packed: PackedImage[]; unpacked: ImageFile[]; canvasWidth: number; canvasHeight: number } {
  const packer = new MaxRectsPacker(canvasWidth, canvasHeight, padding, {
    allowRotation,
    logic: getPackingLogic(sortingStrategy),
    smart: false,
    pot: false,
    square: false,
    border: 0,
  });
  
  const packed: PackedImage[] = [];
  const unpacked: ImageFile[] = [];
  const expectedBinIndex = 0;

  for (const img of images) {
    const rect = {
      width: img.width,
      height: img.height,
      data: { image: img }
    };
    
    packer.add(rect);
    
    const bin = packer.bins[expectedBinIndex];
    const rectInFirstBin = bin && bin.rects.find(r => r.data?.image?.id === img.id);
    
    const fitsInCanvas = rectInFirstBin && 
      typeof rectInFirstBin.x === 'number' && 
      typeof rectInFirstBin.y === 'number' &&
      rectInFirstBin.x >= 0 && 
      rectInFirstBin.y >= 0 &&
      rectInFirstBin.x + rectInFirstBin.width <= canvasWidth + padding &&
      rectInFirstBin.y + rectInFirstBin.height <= canvasHeight + padding;
    
    if (fitsInCanvas) {
      packed.push({
        ...img,
        x: rectInFirstBin.x,
        y: rectInFirstBin.y,
        rotated: rectInFirstBin.rot || false,
        displayWidth: rectInFirstBin.width,
        displayHeight: rectInFirstBin.height,
      });
    } else {
      unpacked.push(img);
    }
  }

  const bin = packer.bins[0];
  return { 
    packed, 
    unpacked,
    canvasWidth: bin?.width || canvasWidth,
    canvasHeight: bin?.height || canvasHeight
  };
}

/**
 * Uniform grid layout - all images same cell size
 */
function packUniform(
  images: ImageFile[],
  canvasWidth: number,
  canvasHeight: number,
  _padding: number,
  cellPadding: number,
  _fitMode: 'contain' | 'cover' = 'contain'
): { packed: PackedImage[]; unpacked: ImageFile[]; canvasWidth: number; canvasHeight: number } {
  if (images.length === 0) {
    return { packed: [], unpacked: [], canvasWidth, canvasHeight };
  }

  // Estimate grid: find cols/rows that best fit within canvas bounds
  let bestCols = 1, bestRows = 1;
  let bestEfficiency = 0;
  let bestFitCount = 0;

  // Minimum reasonable cell dimensions to prevent extreme scaling
  const MIN_CELL_DIMENSION = 50;

  for (let cols = 1; cols <= images.length; cols++) {
    const cellWidth = (canvasWidth - (cols + 1) * cellPadding) / cols;

    if (cellWidth <= 0) continue;

    // Calculate max rows that fit in canvas height
    for (let rows = 1; rows <= images.length; rows++) {
      const cellHeight = (canvasHeight - (rows + 1) * cellPadding) / rows;

      if (cellHeight <= 0) break; // More rows will only make cellHeight smaller

      // Require reasonable cell dimensions to prevent extreme scaling
      if (cellWidth < MIN_CELL_DIMENSION || cellHeight < MIN_CELL_DIMENSION) continue;

      // Count how many images fit in this grid (cols * rows cells max)
      const maxCells = cols * rows;
      let fitCount = 0;

      for (let i = 0; i < Math.min(images.length, maxCells); i++) {
        const img = images[i];
        if (img.width <= cellWidth && img.height <= cellHeight) {
          fitCount++;
        }
      }

      const efficiency = fitCount / images.length;
      if (efficiency > bestEfficiency || (efficiency === bestEfficiency && fitCount > bestFitCount)) {
        bestEfficiency = efficiency;
        bestFitCount = fitCount;
        bestCols = cols;
        bestRows = rows;
      }
    }
  }

  const cols = bestCols;
  const rows = bestRows;
  const cellWidth = (canvasWidth - (cols + 1) * cellPadding) / cols;
  const cellHeight = (canvasHeight - (rows + 1) * cellPadding) / rows;
  const maxCells = cols * rows;

  const packed: PackedImage[] = [];
  const unpacked: ImageFile[] = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const col = i % cols;
    const row = Math.floor(i / cols);

    // Check if we've exceeded the grid capacity (cols * rows cells)
    if (i >= maxCells) {
      unpacked.push(img);
      continue;
    }

    // Also check if row exceeds calculated rows
    if (row >= rows) {
      unpacked.push(img);
      continue;
    }

    const x = cellPadding + col * (cellWidth + cellPadding);
    const y = cellPadding + row * (cellHeight + cellPadding);

    if (img.width > cellWidth || img.height > cellHeight) {
      unpacked.push(img);
      continue;
    }

    packed.push({
      ...img,
      x: Math.round(x),
      y: Math.round(y),
      rotated: false,
      displayWidth: img.width,
      displayHeight: img.height,
    });
  }

  return { packed, unpacked, canvasWidth, canvasHeight };
}

/**
 * Columns layout - fixed number of columns, variable row heights
 */
function packColumns(
  images: ImageFile[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number,
  columns: number,
  allowRotation: boolean
): { packed: PackedImage[]; unpacked: ImageFile[]; canvasWidth: number; canvasHeight: number } {
  if (images.length === 0 || columns <= 0) {
    return { packed: [], unpacked: images, canvasWidth, canvasHeight };
  }

  // Use actual number of columns based on image count to avoid overly wide columns
  const cols = Math.min(columns, images.length);
  const colWidth = (canvasWidth - (cols + 1) * padding) / cols;

  if (colWidth <= 0) {
    return { packed: [], unpacked: images, canvasWidth, canvasHeight };
  }

  // Distribute images across columns (greedy by height)
  const colImages: ImageFile[][] = Array.from({ length: cols }, () => []);
  const colHeights = Array(cols).fill(0);

  for (const img of images) {
    // Find column with minimum current height
    const minCol = colHeights.indexOf(Math.min(...colHeights));
    colImages[minCol].push(img);

    // Estimate height if placed in this column (with rotation check)
    // Use contain-style estimation: scale to fit colWidth, but don't scale UP
    let bestHeight = img.height;
    if (allowRotation) {
      const rotatedHeight = img.width;
      if (rotatedHeight < bestHeight) {
        bestHeight = rotatedHeight;
      }
    }
    colHeights[minCol] += bestHeight + padding;
  }

  // Check if any column exceeds canvas height
  const maxColHeight = Math.max(...colHeights);
  if (maxColHeight > canvasHeight) {
    // Some images won't fit - we'll handle in the loop
  }

  const packed: PackedImage[] = [];
  const unpacked: ImageFile[] = [];

  for (let col = 0; col < cols; col++) {
    let currentY = padding;

    for (const img of colImages[col]) {
      const x = padding + col * (colWidth + padding);

      // Try with rotation if allowed
      let displayWidth = img.width;
      let displayHeight = img.height;
      let rotated = false;

      if (allowRotation) {
        // Use contain-style scaling - don't scale UP, only scale DOWN to fit
        const normalHeight = img.height;
        const rotatedHeight = img.width;

        if (rotatedHeight < normalHeight && rotatedHeight <= canvasHeight - currentY - padding) {
          // Rotation fits better
          displayWidth = img.height;
          displayHeight = img.width;
          rotated = true;
        } else if (normalHeight <= canvasHeight - currentY - padding) {
          displayWidth = img.width;
          displayHeight = normalHeight;
          rotated = false;
        } else {
          // Doesn't fit in this column
          unpacked.push(img);
          continue;
        }
      } else {
        // Native size, no scaling
        if (img.width > colWidth || img.height > canvasHeight - currentY - padding) {
          unpacked.push(img);
          continue;
        }
        displayWidth = img.width;
        displayHeight = img.height;
      }

      packed.push({
        ...img,
        x: Math.round(x),
        y: Math.round(currentY),
        rotated,
        displayWidth: Math.round(displayWidth),
        displayHeight: Math.round(displayHeight),
      });

      currentY += displayHeight + padding;
    }
  }

  return { packed, unpacked, canvasWidth, canvasHeight };
}

/**
 * Rows layout - fixed number of rows, variable column widths
 */
function packRows(
  images: ImageFile[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number,
  rows: number,
  allowRotation: boolean
): { packed: PackedImage[]; unpacked: ImageFile[]; canvasWidth: number; canvasHeight: number } {
  if (images.length === 0 || rows <= 0) {
    return { packed: [], unpacked: images, canvasWidth, canvasHeight };
  }

  const r = Math.min(rows, images.length);
  const rowHeight = (canvasHeight - (r + 1) * padding) / r;

  if (rowHeight <= 0) {
    return { packed: [], unpacked: images, canvasWidth, canvasHeight };
  }

  // Distribute images across rows (greedy by width)
  const rowImages: ImageFile[][] = Array.from({ length: r }, () => []);
  const rowWidths = Array(r).fill(0);

  for (const img of images) {
    const minRow = rowWidths.indexOf(Math.min(...rowWidths));
    rowImages[minRow].push(img);

    let bestWidth = img.width;
    if (allowRotation) {
      const rotatedWidth = img.height;
      if (rotatedWidth < img.width) {
        bestWidth = rotatedWidth;
      }
    }
    rowWidths[minRow] += bestWidth + padding;
  }

  const packed: PackedImage[] = [];
  const unpacked: ImageFile[] = [];

  for (let row = 0; row < r; row++) {
    let currentX = padding;

    for (const img of rowImages[row]) {
      const y = padding + row * (rowHeight + padding);

      let displayWidth = img.width;
      let displayHeight = img.height;
      let rotated = false;

      if (allowRotation) {
        const normalWidth = img.width;
        const rotatedWidth = img.height;

        if (rotatedWidth < normalWidth && rotatedWidth <= canvasWidth - currentX - padding) {
          displayWidth = img.height;
          displayHeight = img.width;
          rotated = true;
        } else if (normalWidth <= canvasWidth - currentX - padding) {
          displayWidth = img.width;
          displayHeight = img.height;
          rotated = false;
        } else {
          unpacked.push(img);
          continue;
        }
      } else {
        // Native size, no scaling
        if (img.width > canvasWidth - currentX - padding || img.height > rowHeight) {
          unpacked.push(img);
          continue;
        }
        displayWidth = img.width;
        displayHeight = img.height;
      }

      packed.push({
        ...img,
        x: Math.round(currentX),
        y: Math.round(y),
        rotated,
        displayWidth: Math.round(displayWidth),
        displayHeight: Math.round(displayHeight),
      });

      currentX += displayWidth + padding;
    }
  }

  return { packed, unpacked, canvasWidth, canvasHeight };
}

/**
 * Guillotine layout - recursive binary space partitioning
 */
function packGuillotine(
  images: ImageFile[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number,
  allowRotation: boolean,
  sortingStrategy: SortingStrategy
): { packed: PackedImage[]; unpacked: ImageFile[]; canvasWidth: number; canvasHeight: number } {
  // Simple guillotine algorithm using sorted images
  const sortedImages = sortImages(images, sortingStrategy);
  
  type FreeRect = { x: number; y: number; width: number; height: number };
  
  const freeRects: FreeRect[] = [{ x: padding, y: padding, width: canvasWidth - 2 * padding, height: canvasHeight - 2 * padding }];
  const packed: PackedImage[] = [];
  const unpacked: ImageFile[] = [];

  function findBestRect(img: ImageFile): { rect: FreeRect; rotated: boolean; index: number } | null {
    let bestIndex = -1;
    let bestRect: FreeRect | null = null;
    let bestRotated = false;
    let bestScore = Infinity;

    for (let i = 0; i < freeRects.length; i++) {
      const fr = freeRects[i];
      
      // Try without rotation
      if (img.width <= fr.width && img.height <= fr.height) {
        const score = Math.min(fr.width - img.width, fr.height - img.height);
        if (score < bestScore) {
          bestScore = score;
          bestIndex = i;
          bestRect = fr;
          bestRotated = false;
        }
      }
      
      // Try with rotation
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

  function splitFreeRect(freeRect: FreeRect, placedRect: { x: number; y: number; width: number; height: number }): FreeRect[] {
    const result: FreeRect[] = [];
    
    // Split horizontally (top/bottom)
    if (placedRect.y > freeRect.y) {
      result.push({
        x: freeRect.x,
        y: freeRect.y,
        width: freeRect.width,
        height: placedRect.y - freeRect.y,
      });
    }
    if (placedRect.y + placedRect.height < freeRect.y + freeRect.height) {
      result.push({
        x: freeRect.x,
        y: placedRect.y + placedRect.height,
        width: freeRect.width,
        height: freeRect.y + freeRect.height - (placedRect.y + placedRect.height),
      });
    }
    
    // Split vertically (left/right)
    if (placedRect.x > freeRect.x) {
      result.push({
        x: freeRect.x,
        y: freeRect.y,
        width: placedRect.x - freeRect.x,
        height: freeRect.height,
      });
    }
    if (placedRect.x + placedRect.width < freeRect.x + freeRect.width) {
      result.push({
        x: placedRect.x + placedRect.width,
        y: freeRect.y,
        width: freeRect.x + freeRect.width - (placedRect.x + placedRect.width),
        height: freeRect.height,
      });
    }
    
    return result;
  }

  function pruneFreeRects(): void {
    // Remove free rects that are contained within others
    for (let i = freeRects.length - 1; i >= 0; i--) {
      for (let j = freeRects.length - 1; j >= 0; j--) {
        if (i !== j && 
            freeRects[i].x >= freeRects[j].x &&
            freeRects[i].y >= freeRects[j].y &&
            freeRects[i].x + freeRects[i].width <= freeRects[j].x + freeRects[j].width &&
            freeRects[i].y + freeRects[i].height <= freeRects[j].y + freeRects[j].height) {
          freeRects.splice(i, 1);
          break;
        }
      }
    }
  }

  for (const img of sortedImages) {
    const placement = findBestRect(img);
    
    if (placement) {
      const { rect, rotated, index } = placement;
      const w = rotated ? img.height : img.width;
      const h = rotated ? img.width : img.height;
      
      const placedRect = {
        x: rect.x,
        y: rect.y,
        width: w,
        height: h,
      };
      
      packed.push({
        ...img,
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        rotated,
        displayWidth: Math.round(w),
        displayHeight: Math.round(h),
      });
      
      // Remove the used free rect and add splits
      freeRects.splice(index, 1);
      const newRects = splitFreeRect(rect, placedRect);
      freeRects.push(...newRects);
      pruneFreeRects();
    } else {
      unpacked.push(img);
    }
  }

  return { packed, unpacked, canvasWidth, canvasHeight };
}

/**
 * Main packing dispatcher
 */
export function packImages(
  images: ImageFile[],
  options: PackingOptions
): PackingResult {
  if (images.length === 0) {
    return {
      packedImages: [],
      canvasSize: options.canvasSize,
      efficiency: 0,
      unusedImages: [],
      stats: {
        totalImages: 0,
        packedCount: 0,
        unpackedCount: 0,
        totalArea: 0,
        usedArea: 0,
        efficiency: 0,
        canvasArea: options.canvasSize.width * options.canvasSize.height,
      },
      layoutMode: options.layoutMode || 'mixed',
    };
  }

  // Sort images based on strategy
  const sortedImages = sortImages(images, options.sortingStrategy);
  
  // Default layout options
  const layoutMode = options.layoutMode || 'mixed';
  const columns = options.columns || 4;
  const rows = options.rows || 3;
  const cellPadding = options.cellPadding || 4;
  const fitMode = options.fitMode || 'contain';

  // Dispatch to appropriate layout function
  let result: { packed: PackedImage[]; unpacked: ImageFile[]; canvasWidth: number; canvasHeight: number };

  switch (layoutMode) {
    case 'uniform':
    case 'contact-sheet':
      result = packUniform(sortedImages, options.canvasSize.width, options.canvasSize.height, options.padding, cellPadding, fitMode);
      break;
    case 'columns':
      result = packColumns(sortedImages, options.canvasSize.width, options.canvasSize.height, options.padding, columns, options.allowRotation);
      break;
    case 'rows':
      result = packRows(sortedImages, options.canvasSize.width, options.canvasSize.height, options.padding, rows, options.allowRotation);
      break;
    case 'guillotine':
      result = packGuillotine(sortedImages, options.canvasSize.width, options.canvasSize.height, options.padding, options.allowRotation, options.sortingStrategy);
      break;
    case 'mixed':
    default:
      result = tryPackMixed(sortedImages, options.canvasSize.width, options.canvasSize.height, options.allowRotation, options.padding, options.sortingStrategy);
      break;
  }

  let { packed, unpacked, canvasWidth, canvasHeight } = result;

  // For non-mixed modes, we don't auto-expand canvas (fixed layout)
  // For mixed mode, we can try expanding if images don't fit
  if (layoutMode === 'mixed') {
    let currentWidth = options.canvasSize.width;
    let currentHeight = options.canvasSize.height;
    let attempts = 0;
    const maxAttempts = 10;

    while (unpacked.length > 0 && attempts < maxAttempts) {
      currentWidth = Math.ceil(currentWidth * 1.2);
      currentHeight = Math.ceil(currentHeight * 1.2);
      
      const newResult = tryPackMixed(
        sortedImages,
        currentWidth,
        currentHeight,
        options.allowRotation,
        options.padding,
        options.sortingStrategy
      );
      
      if (newResult.unpacked.length < unpacked.length) {
        packed = newResult.packed;
        unpacked = newResult.unpacked;
        canvasWidth = newResult.canvasWidth;
        canvasHeight = newResult.canvasHeight;
      } else {
        break;
      }
      attempts++;
    }
  }

  const finalWidth = canvasWidth || options.canvasSize.width;
  const finalHeight = canvasHeight || options.canvasSize.height;

  // Calculate statistics
  const totalArea = images.reduce((sum, img) => sum + img.area, 0);
  const usedArea = packed.reduce((sum, img) => sum + img.area, 0);
  const canvasArea = finalWidth * finalHeight;
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
    canvasSize: { width: finalWidth, height: finalHeight },
    efficiency,
    unusedImages: unpacked,
    stats,
    layoutMode,
  };
}

/**
 * Pack a single page with the given images
 * Returns the same result structure as the internal layout functions
 */
function packSinglePage(
  images: ImageFile[],
  options: PackingOptions
): { packed: PackedImage[]; unpacked: ImageFile[]; canvasWidth: number; canvasHeight: number; efficiency: number } {
  const layoutMode = options.layoutMode || 'mixed';
  const columns = options.columns || 4;
  const rows = options.rows || 3;
  const cellPadding = options.cellPadding || 4;
  const fitMode = options.fitMode || 'contain';

  // Sort images for this page
  const sortedImages = sortImages(images, options.sortingStrategy);

  let result: { packed: PackedImage[]; unpacked: ImageFile[]; canvasWidth: number; canvasHeight: number };

  switch (layoutMode) {
    case 'uniform':
    case 'contact-sheet':
      result = packUniform(sortedImages, options.canvasSize.width, options.canvasSize.height, options.padding, cellPadding, fitMode);
      break;
    case 'columns':
      result = packColumns(sortedImages, options.canvasSize.width, options.canvasSize.height, options.padding, columns, options.allowRotation);
      break;
    case 'rows':
      result = packRows(sortedImages, options.canvasSize.width, options.canvasSize.height, options.padding, rows, options.allowRotation);
      break;
    case 'guillotine':
      result = packGuillotine(sortedImages, options.canvasSize.width, options.canvasSize.height, options.padding, options.allowRotation, options.sortingStrategy);
      break;
    case 'mixed':
    default:
      // For mixed mode, we first try with auto-expand (existing behavior)
      // If still unpacked after max expansion, we'll handle in the multi-page loop
      result = tryPackMixed(sortedImages, options.canvasSize.width, options.canvasSize.height, options.allowRotation, options.padding, options.sortingStrategy);
      break;
  }

  const finalWidth = result.canvasWidth || options.canvasSize.width;
  const finalHeight = result.canvasHeight || options.canvasSize.height;

  // Calculate efficiency
  const usedArea = result.packed.reduce((sum, img) => sum + img.area, 0);
  const canvasArea = finalWidth * finalHeight;
  const efficiency = canvasArea > 0 ? (usedArea / canvasArea) * 100 : 0;

  return {
    packed: result.packed,
    unpacked: result.unpacked,
    canvasWidth: finalWidth,
    canvasHeight: finalHeight,
    efficiency
  };
}

/**
 * Multi-page packing: distributes images across multiple canvases when they don't fit in one
 */
export function packImagesMultiPage(
  images: ImageFile[],
  options: PackingOptions,
  maxPages: number = 10
): PackingResult {
  if (images.length === 0) {
    return {
      packedImages: [],
      canvasSize: options.canvasSize,
      efficiency: 0,
      unusedImages: [],
      stats: {
        totalImages: 0,
        packedCount: 0,
        unpackedCount: 0,
        totalArea: 0,
        usedArea: 0,
        efficiency: 0,
        canvasArea: options.canvasSize.width * options.canvasSize.height,
      },
      layoutMode: options.layoutMode || 'mixed',
      pages: [],
      totalPages: 0,
      isMultiPage: false,
    };
  }

  // Sort images based on strategy
  const sortedImages = sortImages(images, options.sortingStrategy);
  
  let remainingImages = sortedImages;
  const allPages: PackedPage[] = [];
  let pageNumber = 1;
  const layoutMode = options.layoutMode || 'mixed';
  const maxPagesLimit = maxPages || 10;

  // For mixed mode, we need to pass the original images to each page attempt
  // because tryPackMixed re-sorts internally
  const baseOptions: PackingOptions = { ...options };

  while (remainingImages.length > 0 && pageNumber <= maxPagesLimit) {
    const singlePageResult = packSinglePage(remainingImages, baseOptions);
    
    // If no images were packed on this page, break to avoid infinite loop
    if (singlePageResult.packed.length === 0) {
      break;
    }

    const pageCanvasSize: CanvasSize = { 
      width: singlePageResult.canvasWidth, 
      height: singlePageResult.canvasHeight 
    };

    allPages.push({
      images: singlePageResult.packed,
      canvasSize: pageCanvasSize,
      efficiency: singlePageResult.efficiency,
      pageNumber
    });

    remainingImages = singlePageResult.unpacked;
    pageNumber++;
  }

  // If we hit max pages but still have unpacked images, add them to unusedImages
  const unusedImages = remainingImages;

  // Combine all packed images for backward compatibility (first page data)
  const allPackedImages = allPages.flatMap(page => page.images);
  const firstPage = allPages[0];
  const totalArea = images.reduce((sum, img) => sum + img.area, 0);
  const usedArea = allPackedImages.reduce((sum, img) => sum + img.area, 0);
  const firstPageCanvasArea = firstPage ? firstPage.canvasSize.width * firstPage.canvasSize.height : options.canvasSize.width * options.canvasSize.height;
  const firstPageEfficiency = firstPageCanvasArea > 0 ? (firstPage?.images.reduce((sum, img) => sum + img.area, 0) || 0) / firstPageCanvasArea * 100 : 0;

  // Calculate total canvas area across all pages
  const totalCanvasArea = allPages.reduce((sum, page) => sum + page.canvasSize.width * page.canvasSize.height, 0);
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
    canvasSize: firstPage?.canvasSize || options.canvasSize,
    efficiency: firstPageEfficiency,
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
          ctx.save();
          ctx.translate(packedImg.x + packedImg.displayWidth / 2, packedImg.y + packedImg.displayHeight / 2);
          if (packedImg.rotated) {
            ctx.rotate(Math.PI / 2);
          }
          ctx.drawImage(
            img,
            -packedImg.displayWidth / 2,
            -packedImg.displayHeight / 2,
            packedImg.displayWidth,
            packedImg.displayHeight
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