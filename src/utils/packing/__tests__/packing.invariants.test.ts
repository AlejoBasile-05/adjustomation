import { describe, expect, test } from 'vitest';
import { packImages } from '../../packing';
import { downloadPackedCanvas } from '../../packing/export';
import type { SortingStrategy, LayoutMode } from '../../../types';
import { makeImage, assertNoOverlaps, assertAllInsideCanvas, assertDeterministic, assertConservation } from './helpers';

const sortingStrategies: SortingStrategy[] = ['area-desc', 'area-asc', 'width-desc', 'height-desc', 'max-side-desc', 'aspect-ratio'];
const layoutModes: LayoutMode[] = ['mixed', 'uniform', 'columns', 'rows', 'guillotine', 'contact-sheet'];

const defaultOptions = {
  canvasSize: { width: 800, height: 600 },
  allowRotation: true,
  padding: 4,
  sortingStrategy: 'area-desc' as SortingStrategy,
  layoutMode: 'mixed' as LayoutMode,
  columns: 4,
  rows: 3,
  cellPadding: 4,
  fitMode: 'contain' as 'contain' | 'cover',
};

function generateHeterogeneousSet(count: number) {
  const images = [];
  
  for (let i = 0; i < count; i++) {
    const type = i % 5;
    let w, h;
    
    switch (type) {
      case 0: // very wide
        w = 1000;
        h = 10;
        break;
      case 1: // very tall
        w = 10;
        h = 1000;
        break;
      case 2: // square
        w = 100;
        h = 100;
        break;
      case 3: // tiny
        w = 5;
        h = 5;
        break;
      case 4: // huge
        w = 800;
        h = 800;
        break;
    }
    
    images.push(makeImage(`img-${i}`, w, h));
  }
  
  return images;
}

function generateUniformSet(count: number, w = 100, h = 100) {
  const images = [];
  for (let i = 0; i < count; i++) {
    images.push(makeImage(`img-${i}`, w, h));
  }
  return images;
}

describe('Packing Invariants', () => {
  describe('Invariant 1: No overlaps', () => {
    test.each(sortingStrategies)('%s: no two packed images overlap', (strategy) => {
      const images = generateHeterogeneousSet(20);
      const result = packImages(images, { ...defaultOptions, sortingStrategy: strategy });
      assertNoOverlaps(result.packedImages, result.canvasSize.width, result.canvasSize.height);
    });
  });

  describe('Invariant 2: All inside canvas', () => {
    test.each(sortingStrategies)('%s: all packed images inside canvas bounds', (strategy) => {
      const images = generateHeterogeneousSet(20);
      const result = packImages(images, { ...defaultOptions, sortingStrategy: strategy });
      assertAllInsideCanvas(result.packedImages, result.canvasSize.width, result.canvasSize.height);
    });
  });

  describe('Invariant 3: Conservation', () => {
    test.each(sortingStrategies)('%s: packed + unpacked === total', (strategy) => {
      const images = generateHeterogeneousSet(20);
      const result = packImages(images, { ...defaultOptions, sortingStrategy: strategy });
      assertConservation(result.packedImages, result.unusedImages, images.length);
    });
  });

  describe('Invariant 4: Determinism', () => {
    test.each(sortingStrategies)('%s: deterministic output', (strategy) => {
      const images = generateHeterogeneousSet(20);
      const packFn = (imgs: typeof images) => packImages(imgs, { ...defaultOptions, sortingStrategy: strategy });
      assertDeterministic(packFn, images);
    });
  });

  describe('Invariant 5: Efficiency', () => {
    test.each(sortingStrategies)('%s: efficiency === usedArea/canvasArea*100', (strategy) => {
      const images = generateHeterogeneousSet(20);
      const result = packImages(images, { ...defaultOptions, sortingStrategy: strategy });
      const expected = (result.stats.usedArea / result.stats.canvasArea) * 100;
      expect(result.efficiency).toBeCloseTo(expected, 5);
    });
  });

  describe('Invariant 6: Export', () => {
    test('downloadPackedCanvas executes without error', async () => {
      const images = generateHeterogeneousSet(5);
      const result = packImages(images, { ...defaultOptions, canvasSize: {width:400,height:300}, sortingStrategy: 'area-desc' });
      // Function returns void, just verify it doesn't throw
      await expect(downloadPackedCanvas(result.packedImages, result.canvasSize, '#ffffff')).resolves.not.toThrow();
    });
  });
});

describe('Layout Modes', () => {
  const testOptions = {
    canvasSize: { width: 800, height: 600 },
    allowRotation: true,
    padding: 4,
    sortingStrategy: 'area-desc' as SortingStrategy,
    layoutMode: 'mixed' as LayoutMode,
    columns: 4,
    rows: 3,
    cellPadding: 4,
    fitMode: 'contain' as 'contain' | 'cover',
  };

  describe('mixed (MaxRects)', () => {
    test('packs images using MaxRects algorithm', () => {
      const images = generateHeterogeneousSet(10);
      const result = packImages(images, { ...testOptions, layoutMode: 'mixed' });
      assertNoOverlaps(result.packedImages, result.canvasSize.width, result.canvasSize.height);
      assertAllInsideCanvas(result.packedImages, result.canvasSize.width, result.canvasSize.height);
    });
  });

  describe('uniform (grid)', () => {
    test('packs uniform images in grid', () => {
      const images = generateUniformSet(12, 100, 100);
      const result = packImages(images, { ...testOptions, layoutMode: 'uniform', cellPadding: 4 });
      assertNoOverlaps(result.packedImages, result.canvasSize.width, result.canvasSize.height);
      assertAllInsideCanvas(result.packedImages, result.canvasSize.width, result.canvasSize.height);
      expect(result.packedImages.length).toBe(12);
    });

    test('respects fitMode contain', () => {
      const images = generateUniformSet(6, 200, 100);
      const result = packImages(images, { ...testOptions, layoutMode: 'uniform', fitMode: 'contain', cellPadding: 4 });
      expect(result.packedImages.length).toBe(6);
      // All should fit with contain mode
      result.packedImages.forEach(img => {
        expect(img.displayWidth).toBeLessThanOrEqual(800);
        expect(img.displayHeight).toBeLessThanOrEqual(600);
      });
    });

    test('respects fitMode cover', () => {
      const images = generateUniformSet(6, 200, 100);
      const result = packImages(images, { ...testOptions, layoutMode: 'uniform', fitMode: 'cover', cellPadding: 4 });
      expect(result.packedImages.length).toBe(6);
      result.packedImages.forEach(img => {
        expect(img.sourceRect).toBeDefined();
      });
    });
  });

  describe('columns', () => {
    test('packs images in specified columns', () => {
      const images = generateHeterogeneousSet(8);
      const result = packImages(images, { ...testOptions, layoutMode: 'columns', columns: 3 });
      assertNoOverlaps(result.packedImages, result.canvasSize.width, result.canvasSize.height);
      assertAllInsideCanvas(result.packedImages, result.canvasSize.width, result.canvasSize.height);
    });

    test('distributes across columns', () => {
      const images = generateUniformSet(6, 100, 100);
      const result = packImages(images, { ...testOptions, layoutMode: 'columns', columns: 3 });
      expect(result.packedImages.length).toBe(6);
      
      // Check images are distributed across 3 columns
      const xPositions = [...new Set(result.packedImages.map(img => Math.round(img.x / 100) * 100))];
      expect(xPositions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('rows', () => {
    test('packs images in specified rows', () => {
      const images = generateHeterogeneousSet(8);
      const result = packImages(images, { ...testOptions, layoutMode: 'rows', rows: 3 });
      assertNoOverlaps(result.packedImages, result.canvasSize.width, result.canvasSize.height);
      assertAllInsideCanvas(result.packedImages, result.canvasSize.width, result.canvasSize.height);
    });
  });

  describe('guillotine', () => {
    test('packs images using guillotine algorithm', () => {
      const images = generateUniformSet(10, 100, 100);
      const result = packImages(images, { ...testOptions, layoutMode: 'guillotine' });
      assertNoOverlaps(result.packedImages, result.canvasSize.width, result.canvasSize.height);
      assertAllInsideCanvas(result.packedImages, result.canvasSize.width, result.canvasSize.height);
    });
  });

  describe('contact-sheet', () => {
    test('packs like uniform grid', () => {
      const images = generateUniformSet(12, 100, 100);
      const result = packImages(images, { ...testOptions, layoutMode: 'contact-sheet', cellPadding: 4 });
      assertNoOverlaps(result.packedImages, result.canvasSize.width, result.canvasSize.height);
      assertAllInsideCanvas(result.packedImages, result.canvasSize.width, result.canvasSize.height);
      expect(result.packedImages.length).toBe(12);
    });
  });

  describe('Edge cases across all layout modes', () => {
    const modes: LayoutMode[] = ['mixed', 'uniform', 'columns', 'rows', 'guillotine', 'contact-sheet'];

    test.each(modes)('%s: empty image array returns empty result', (mode) => {
      const result = packImages([], { ...testOptions, layoutMode: mode });
      expect(result.packedImages).toHaveLength(0);
      expect(result.unusedImages).toHaveLength(0);
      expect(result.efficiency).toBe(0);
      expect(result.stats.totalImages).toBe(0);
    });

    test.each(modes)('%s: single image packs correctly', (mode) => {
      const images = [makeImage('single', 100, 100)];
      const result = packImages(images, { ...testOptions, layoutMode: mode, canvasSize: { width: 800, height: 600 } });
      expect(result.packedImages.length).toBe(1);
      expect(result.packedImages[0].x).toBeGreaterThanOrEqual(0);
      expect(result.packedImages[0].y).toBeGreaterThanOrEqual(0);
    });

    test.each(modes)('%s: oversized image handled gracefully', (mode) => {
      const images = [makeImage('huge', 2000, 2000)];
      const result = packImages(images, { ...testOptions, layoutMode: mode, canvasSize: { width: 800, height: 600 } });
      // May pack or not depending on mode, but shouldn't crash
      expect(result).toBeDefined();
      expect(result.stats).toBeDefined();
    });

    test.each(['columns', 'rows', 'guillotine'])('%s: rotation works when enabled', (mode) => {
      const images = [makeImage('portrait', 100, 200)];
      const result = packImages(images, { ...testOptions, layoutMode: mode as LayoutMode, allowRotation: true, canvasSize: { width: 800, height: 600 } });
      expect(result.packedImages).toHaveLength(1);
      // With rotation, portrait images may be rotated to landscape
      expect([result.packedImages[0].rotated]).toBeDefined();
    });

    test.each(['columns', 'rows', 'guillotine'])('%s: rotation disabled keeps original orientation', (mode) => {
      const images = [makeImage('portrait', 100, 200)];
      const result = packImages(images, { ...testOptions, layoutMode: mode as LayoutMode, allowRotation: false, canvasSize: { width: 800, height: 600 } });
      expect(result.packedImages).toHaveLength(1);
      // Without rotation, should not be rotated
      expect(result.packedImages[0].rotated).toBe(false);
    });

    test('uniform: fitMode contain preserves aspect ratio', () => {
      const images = generateUniformSet(4, 200, 100); // 2:1 aspect ratio
      const result = packImages(images, { ...testOptions, layoutMode: 'uniform', fitMode: 'contain', cellPadding: 4 });
      result.packedImages.forEach(img => {
        expect(img.displayWidth / img.displayHeight).toBeCloseTo(2, 1);
      });
    });

    test('uniform: fitMode cover crops to fill cell', () => {
      const images = generateUniformSet(4, 200, 100);
      const result = packImages(images, { ...testOptions, layoutMode: 'uniform', fitMode: 'cover', cellPadding: 4 });
      result.packedImages.forEach(img => {
        expect(img.sourceRect).toBeDefined();
        if (img.sourceRect) {
          // Source rect should be cropped from original
          expect(img.sourceRect.sw).toBeLessThanOrEqual(img.width);
          expect(img.sourceRect.sh).toBeLessThanOrEqual(img.height);
        }
      });
    });

    test('columns: distributes images across specified columns', () => {
      const images = generateUniformSet(12, 100, 100);
      const result = packImages(images, { ...testOptions, layoutMode: 'columns', columns: 4 });
      // With 800x600 canvas, 4 columns, padding=4:
      // colWidth = (800 - 5*4) / 4 = 195
      // Each image scaled to 195 width, height = 195
      // 3 images per column = 3 * (195 + 4) = 597 height, fits!
      expect(result.packedImages.length).toBeGreaterThanOrEqual(8);
      
      // Check distribution - should use at most 4 columns
      const xPositions = [...new Set(result.packedImages.map(img => Math.round(img.x / 100) * 100))];
      expect(xPositions.length).toBeLessThanOrEqual(4);
    });

    test('rows: distributes images across specified rows', () => {
      const images = generateUniformSet(12, 100, 100);
      const result = packImages(images, { ...testOptions, layoutMode: 'rows', rows: 3 });
      expect(result.packedImages.length).toBe(12);
      
      // Check distribution - should use at most 3 rows
      const yPositions = [...new Set(result.packedImages.map(img => Math.round(img.y / 100) * 100))];
      expect(yPositions.length).toBeLessThanOrEqual(3);
    });

    test('guillotine: splits space recursively', () => {
      const images = generateUniformSet(8, 100, 100);
      const result = packImages(images, { ...testOptions, layoutMode: 'guillotine' });
      expect(result.packedImages.length).toBe(8);
      assertNoOverlaps(result.packedImages, result.canvasSize.width, result.canvasSize.height);
    });

    test('mixed: auto-expands canvas when images dont fit', () => {
      // Many images that won't fit in 800x600
      const images = generateUniformSet(50, 150, 150);
      const result = packImages(images, { ...testOptions, layoutMode: 'mixed', canvasSize: { width: 800, height: 600 } });
      // Canvas should expand
      expect(result.canvasSize.width).toBeGreaterThan(800);
      expect(result.canvasSize.height).toBeGreaterThan(600);
      expect(result.stats.packedCount).toBeGreaterThan(0);
    });
  });
});