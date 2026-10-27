import { ImageFile, PackedImage } from '../../../types';
import { expect } from 'vitest';

export function makeImage(id: string, w: number, h: number): ImageFile {
  return {
    id,
    file: new File([''], `${id}.png`, { type: 'image/png' }),
    preview: `data:image/svg+xml;base64,${btoa(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><rect width='100%' height='100%' fill='%23ccc'/></svg>`)}`,
    width: w,
    height: h,
    aspectRatio: w / h,
    area: w * h,
  };
}

export function makePackedImage(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  rotated: boolean,
  displayWidth: number,
  displayHeight: number
): PackedImage {
  return {
    id,
    file: new File([''], `${id}.png`, { type: 'image/png' }),
    preview: '',
    width,
    height,
    aspectRatio: width / height,
    area: width * height,
    x,
    y,
    rotated,
    displayWidth,
    displayHeight,
  };
}

export function assertNoOverlaps(packed: PackedImage[], _canvasW: number, _canvasH: number): void {
  for (let i = 0; i < packed.length; i++) {
    for (let j = i + 1; j < packed.length; j++) {
      const a = packed[i];
      const b = packed[j];
      
      // displayWidth/displayHeight already account for rotation
      const aw = a.displayWidth;
      const ah = a.displayHeight;
      const bw = b.displayWidth;
      const bh = b.displayHeight;
      
      const overlapX = Math.min(a.x + aw, b.x + bw) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + ah, b.y + bh) - Math.max(a.y, b.y);
      
      // Two rectangles overlap ONLY if BOTH x and y overlap (overlap > 0 in both dimensions)
      // Allow touching (overlap <= 0 means no overlap or just touching)
      const overlaps = overlapX > 0 && overlapY > 0;
      expect(overlaps).toBe(false);
    }
  }
}

export function assertAllInsideCanvas(packed: PackedImage[], canvasW: number, canvasH: number): void {
  packed.forEach((img) => {
    const w = img.displayWidth;
    const h = img.displayHeight;
    const x = img.x ?? 0;
    const y = img.y ?? 0;
    
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + w).toBeLessThanOrEqual(canvasW);
    expect(y + h).toBeLessThanOrEqual(canvasH);
  });
}

export function assertDeterministic(packFn: (imgs: ImageFile[]) => any, input: ImageFile[], runs = 5): void {
  const firstResult = packFn(input);
  
  for (let i = 0; i < runs; i++) {
    const result = packFn(input);
    // Compare key fields for determinism
    expect(result.packedImages.length).toBe(firstResult.packedImages.length);
    expect(result.unusedImages.length).toBe(firstResult.unusedImages.length);
    expect(result.efficiency).toBeCloseTo(firstResult.efficiency, 5);
    expect(result.canvasSize.width).toBe(firstResult.canvasSize.width);
    expect(result.canvasSize.height).toBe(firstResult.canvasSize.height);
    
    // Compare each packed image position
    result.packedImages.forEach((img: PackedImage, idx: number) => {
      const first = firstResult.packedImages[idx];
      expect(img.id).toBe(first.id);
      expect(img.x).toBe(first.x);
      expect(img.y).toBe(first.y);
      expect(img.rotated).toBe(first.rotated);
    });
  }
}

export function assertConservation(packed: PackedImage[], unpacked: ImageFile[], total: number): void {
  expect(packed.length + unpacked.length).toBe(total);
}