import { MaxRectsPacker, PACKING_LOGIC } from 'maxrects-packer';
import type { ImageFile, PackedImage, CanvasSize, PackingOptions, PackingResult, PackingStats, SortingStrategy } from '../types';

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
 * Try to pack images into a canvas using MaxRectsPacker
 */
function tryPack(
  images: ImageFile[],
  canvasWidth: number,
  canvasHeight: number,
  allowRotation: boolean,
  padding: number,
  sortingStrategy: SortingStrategy
): { packed: PackedImage[]; unpacked: ImageFile[] } {
  const packer = new MaxRectsPacker(canvasWidth, canvasHeight, padding, {
    allowRotation,
    logic: getPackingLogic(sortingStrategy),
  });
  
  const packed: PackedImage[] = [];
  const unpacked: ImageFile[] = [];

  for (const img of images) {
    // Create rect object for the packer
    const rect = {
      width: img.width + padding,
      height: img.height + padding,
      data: { image: img }
    };
    
    packer.add(rect);
    
    // Check if it was added successfully by looking at bins
    const lastBin = packer.bins[packer.bins.length - 1];
    const lastRects = lastBin?.rects || [];
    const addedRect = lastRects[lastRects.length - 1];
    
    if (addedRect && addedRect.data?.image?.id === img.id) {
      // Successfully packed
      packed.push({
        ...img,
        x: addedRect.x,
        y: addedRect.y,
        rotated: addedRect.rotated || false,
        displayWidth: addedRect.rotated ? img.height : img.width,
        displayHeight: addedRect.rotated ? img.width : img.height,
      });
    } else {
      unpacked.push(img);
    }
  }

  return { packed, unpacked };
}

/**
 * Main packing function
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
    };
  }

  // Sort images based on strategy
  const sortedImages = sortImages(images, options.sortingStrategy);
  
  // Try to pack with current canvas size
  let { packed, unpacked } = tryPack(
    sortedImages,
    options.canvasSize.width,
    options.canvasSize.height,
    options.allowRotation,
    options.padding,
    options.sortingStrategy
  );

  // If some images didn't fit, try to expand canvas
  let canvasWidth = options.canvasSize.width;
  let canvasHeight = options.canvasSize.height;
  let attempts = 0;
  const maxAttempts = 10;

  while (unpacked.length > 0 && attempts < maxAttempts) {
    // Expand canvas by 20%
    canvasWidth = Math.ceil(canvasWidth * 1.2);
    canvasHeight = Math.ceil(canvasHeight * 1.2);
    
    const newResult = tryPack(
      sortedImages,
      canvasWidth,
      canvasHeight,
      options.allowRotation,
      options.padding,
      options.sortingStrategy
    );
    
    if (newResult.unpacked.length < unpacked.length) {
      packed = newResult.packed;
      unpacked = newResult.unpacked;
    } else {
      // No improvement, stop trying
      break;
    }
    attempts++;
  }

  // Calculate statistics
  const totalArea = images.reduce((sum, img) => sum + img.area, 0);
  const usedArea = packed.reduce((sum, img) => sum + img.area, 0);
  const canvasArea = canvasWidth * canvasHeight;
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
    canvasSize: { width: canvasWidth, height: canvasHeight },
    efficiency,
    unusedImages: unpacked,
    stats,
  };
}

/**
 * Calculate the best canvas size for the given images
 * This tries to find a canvas that fits all images efficiently
 */
export function calculateOptimalCanvasSize(images: ImageFile[]): CanvasSize {
  if (images.length === 0) {
    return { width: 800, height: 600 };
  }

  // Calculate total area
  const totalArea = images.reduce((sum, img) => sum + img.area, 0);
  
  // Estimate canvas size based on square root of total area
  // Add some buffer for packing inefficiency (1.4x factor)
  const estimatedArea = totalArea * 1.4;
  const side = Math.sqrt(estimatedArea);
  
  // Round to nearest 100
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
      URL.revokeObjectURL(url);
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

/**
 * Download packed result as image
 */
export function downloadPackedCanvas(
  packedImages: PackedImage[],
  canvasSize: CanvasSize,
  backgroundColor: string = '#ffffff'
): void {
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return;

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

  // Draw each packed image
  const drawPromises = packedImages.map(packedImg => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.translate(packedImg.x + packedImg.displayWidth / 2, packedImg.y + packedImg.displayHeight / 2);
        if (packedImg.rotated) {
          ctx.rotate(Math.PI / 2);
        }
        ctx.drawImage(img, -packedImg.displayWidth / 2, -packedImg.displayHeight / 2, packedImg.displayWidth, packedImg.displayHeight);
        ctx.restore();
        resolve();
      };
      img.src = packedImg.preview;
    });
  });

  Promise.all(drawPromises).then(() => {
    const link = document.createElement('a');
    link.download = `packed-images-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}