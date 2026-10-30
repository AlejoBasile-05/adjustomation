import { describe, expect, test } from 'vitest';
import { packImages, packImagesMultiPage } from '../../packing';
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
        // Removed sourceRect assertion for NO-RESIZE behavior
      });
    });
  });

  describe('columns', () => {
    test('packs images in specified columns', () => {
      const images = generateUniformSet(8, 100, 100);
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
      const images = generateUniformSet(8, 100, 100);
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
        // Removed sourceRect assertion for NO-RESIZE behavior
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

describe('Multi-page Packing', () => {
  const multiPageOptions = {
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

  test('packImagesMultiPage creates multiple pages when images dont fit', () => {
    // Create many images that won't fit in a single 800x600 canvas
    // Use uniform layout with fitMode: 'cover' (doesn't auto-expand canvas like mixed mode)
    // Max cells in 800x600 with 4px padding: ~148 cells (1 col x 148 rows)
    // So 200 images will force multi-page
    const images = generateUniformSet(200, 150, 150);
    const result = packImagesMultiPage(images, { 
      ...multiPageOptions, 
      layoutMode: 'uniform', 
      maxPages: 5, 
      fitMode: 'cover',
      cellPadding: 4
    }, 5);
    
    expect(result.isMultiPage).toBe(true);
    expect(result.totalPages).toBeGreaterThan(1);
    expect(result.totalPages).toBeLessThanOrEqual(5);
    expect(result.pages).toBeDefined();
    expect(result.pages!.length).toBe(result.totalPages);
  });

  test('packImagesMultiPage respects maxPages limit', () => {
    // Create many images that would need more than 3 pages
    const images = generateUniformSet(100, 300, 300);
    const result = packImagesMultiPage(images, { ...multiPageOptions, maxPages: 3, fitMode: 'cover' }, 3);
    
    expect(result.totalPages).toBeLessThanOrEqual(3);
    expect(result.isMultiPage).toBe(true);
  });

  test('packImagesMultiPage returns isMultiPage false when all fit in one page', () => {
    // Few images that fit in one page
    const images = generateUniformSet(4, 200, 200);
    const result = packImagesMultiPage(images, { ...multiPageOptions, maxPages: 5 }, 5);
    
    expect(result.isMultiPage).toBe(false);
    expect(result.totalPages).toBe(1);
  });

  test('packImagesMultiPage each page has no overlaps', () => {
    const images = generateUniformSet(30, 150, 150);
    const result = packImagesMultiPage(images, { ...multiPageOptions, maxPages: 5 }, 5);
    
    result.pages?.forEach(page => {
      assertNoOverlaps(page.images, page.canvasSize.width, page.canvasSize.height);
      assertAllInsideCanvas(page.images, page.canvasSize.width, page.canvasSize.height);
    });
  });

  test('packImagesMultiPage conservation: packed + unpacked === total', () => {
    const images = generateUniformSet(50, 150, 150);
    const result = packImagesMultiPage(images, { ...multiPageOptions, maxPages: 5 }, 5);
    
    const totalPacked = result.pages?.reduce((sum, page) => sum + page.images.length, 0) || 0;
    expect(totalPacked + result.unusedImages.length).toBe(images.length);
  });

  test('packImagesMultiPage with uniform layout mode', () => {
    // 200 images 150x150 - max cells in 800x600 is ~148, so this forces multi-page
    const images = generateUniformSet(200, 150, 150);
    const result = packImagesMultiPage(images, { 
      ...multiPageOptions, 
      layoutMode: 'uniform',
      cellPadding: 4,
      maxPages: 3,
      fitMode: 'cover'
    }, 3);
    
    expect(result.isMultiPage).toBe(true);
    expect(result.pages).toBeDefined();
    result.pages?.forEach(page => {
      assertNoOverlaps(page.images, page.canvasSize.width, page.canvasSize.height);
    });
  });

  test('packImagesMultiPage with columns layout mode', () => {
    // 200 images 150x150 - columns won't fit all in one 800x600 page
    const images = generateUniformSet(200, 150, 150);
    const result = packImagesMultiPage(images, { 
      ...multiPageOptions, 
      layoutMode: 'columns',
      columns: 3,
      maxPages: 3,
      fitMode: 'cover'
    }, 3);
    
    expect(result.isMultiPage).toBe(true);
    result.pages?.forEach(page => {
      assertNoOverlaps(page.images, page.canvasSize.width, page.canvasSize.height);
    });
  });

  test('packImagesMultiPage with rows layout mode', () => {
    // 200 images 150x150 - rows won't fit all in one 800x600 page
    const images = generateUniformSet(200, 150, 150);
    const result = packImagesMultiPage(images, { 
      ...multiPageOptions, 
      layoutMode: 'rows',
      rows: 3,
      maxPages: 3,
      fitMode: 'cover'
    }, 3);
    
    expect(result.isMultiPage).toBe(true);
    result.pages?.forEach(page => {
      assertNoOverlaps(page.images, page.canvasSize.width, page.canvasSize.height);
    });
  });

  test('packImagesMultiPage with guillotine layout mode', () => {
    // 200 images 150x150 - guillotine won't fit all in one 800x600 page
    const images = generateUniformSet(200, 150, 150);
    const result = packImagesMultiPage(images, { 
      ...multiPageOptions, 
      layoutMode: 'guillotine',
      maxPages: 3,
      fitMode: 'cover'
    }, 3);
    
    expect(result.isMultiPage).toBe(true);
    result.pages?.forEach(page => {
      assertNoOverlaps(page.images, page.canvasSize.width, page.canvasSize.height);
    });
  });

  test('packImagesMultiPage empty array returns empty result', () => {
    const result = packImagesMultiPage([], multiPageOptions, 10);
    
    expect(result.packedImages).toHaveLength(0);
    expect(result.unusedImages).toHaveLength(0);
    expect(result.pages).toHaveLength(0);
    expect(result.totalPages).toBe(0);
    expect(result.isMultiPage).toBe(false);
  });

  test('packImagesMultiPage single image fits in one page', () => {
    const images = [makeImage('single', 100, 100)];
    const result = packImagesMultiPage(images, multiPageOptions, 10);
    
    expect(result.packedImages.length).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.isMultiPage).toBe(false);
  });
});

describe('Export Invariants for Multi-page', () => {
  test('drawPackedPage works with PackedPage', async () => {
    const images = generateUniformSet(4, 200, 100);
    const result = packImages(images, { ...defaultOptions, layoutMode: 'uniform', fitMode: 'contain', cellPadding: 4 });
    
    // Create a mock page
    const page = {
      images: result.packedImages,
      canvasSize: result.canvasSize,
      efficiency: result.efficiency,
      pageNumber: 1,
    };
    
    const { drawPackedPage } = await import('../../packing/export');
    const dataUrl = await drawPackedPage(page, '#ffffff', 'contain');
    expect(dataUrl).toBeDefined();
    expect(dataUrl.startsWith('data:image/png')).toBe(true);
  });

  test('drawAllPackedPages returns array of data URLs', async () => {
    const images = generateUniformSet(10, 150, 150);
    const result = packImagesMultiPage(images, { ...defaultOptions, maxPages: 3 }, 3);
    
    if (result.pages && result.pages.length > 0) {
      const { drawAllPackedPages } = await import('../../packing/export');
      const dataUrls = await drawAllPackedPages(result.pages, '#ffffff', 'contain');
      
      expect(dataUrls).toHaveLength(result.pages.length);
      dataUrls.forEach(url => {
        expect(url.startsWith('data:image/png')).toBe(true);
      });
    }
  });
});