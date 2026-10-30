import type { PackedImage, CanvasSize, PackedPage } from '../../types';

/**
 * Draw packed images onto a canvas and return a data URL.
 * Supports both 'contain' (letterbox) and 'cover' (crop) fit modes.
 */
export async function drawPackedCanvas(
  packedImages: PackedImage[],
  canvasSize: CanvasSize,
  backgroundColor: string = '#ffffff'
): Promise<string> {
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

  // Draw each packed image
  const drawPromises = packedImages.map((packedImg, index) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      // Allow cross-origin for blob URLs (though they're same-origin, this helps with some edge cases)
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          ctx.save();
          ctx.translate(packedImg.x + packedImg.displayWidth / 2, packedImg.y + packedImg.displayHeight / 2);
          if (packedImg.rotated) {
            ctx.rotate(Math.PI / 2);
          }

          // Contain mode: draw full image
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
          console.error(`Error drawing image ${packedImg.id} at index ${index}:`, e);
          reject(e);
        }
      };
      img.onerror = () => {
        console.error(`Failed to load image for export: ${packedImg.id}, preview: ${packedImg.preview?.substring(0, 50)}...`);
        reject(new Error(`Failed to load image: ${packedImg.id}`));
      };
      img.src = packedImg.preview;
    });
  });

  await Promise.all(drawPromises);
  return canvas.toDataURL('image/png');
}

/**
 * Trigger download of a data URL
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/**
 * Convenience: draw and download in one call
 */
export async function downloadPackedCanvas(
  packedImages: PackedImage[],
  canvasSize: CanvasSize,
  backgroundColor: string = '#ffffff'
): Promise<void> {
  const dataUrl = await drawPackedCanvas(packedImages, canvasSize, backgroundColor);
  downloadDataUrl(dataUrl, `packed-images-${Date.now()}.png`);
}

/**
 * Draw a single page to a data URL
 */
export async function drawPackedPage(
  page: PackedPage,
  backgroundColor: string = '#ffffff'
): Promise<string> {
  return drawPackedCanvas(page.images, page.canvasSize, backgroundColor);
}

/**
 * Draw all pages to separate data URLs
 */
export async function drawAllPackedPages(
  pages: PackedPage[],
  backgroundColor: string = '#ffffff'
): Promise<string[]> {
  const dataUrls: string[] = [];
  for (const page of pages) {
    const dataUrl = await drawPackedPage(page, backgroundColor);
    dataUrls.push(dataUrl);
  }
  return dataUrls;
}

/**
 * Download all pages as separate files
 */
export async function downloadAllPackedPages(
  pages: PackedPage[],
  backgroundColor: string = '#ffffff',
  baseFilename: string = 'packed-images'
): Promise<void> {
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const dataUrl = await drawPackedPage(page, backgroundColor);
    const filename = pages.length > 1 
      ? `${baseFilename}-${i + 1}.png` 
      : `${baseFilename}.png`;
    downloadDataUrl(dataUrl, filename);

    // Small delay to allow browser to process multiple downloads
    if (i < pages.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}