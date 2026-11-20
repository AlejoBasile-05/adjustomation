import { describe, expect, test } from 'vitest';
import { packImages, packImagesMultiPage } from '../../packing';
import type { LayoutMode, PackedImage, SortingStrategy } from '../../../types';
import { makeImage, assertNoOverlaps } from './helpers';

const GAP = 10;
const CANVAS = { width: 800, height: 600 };

const baseOptions = {
  canvasSize: CANVAS,
  allowRotation: false,
  padding: GAP,
  sortingStrategy: 'area-desc' as SortingStrategy,
  layoutMode: 'mixed' as LayoutMode,
  columns: 4,
  rows: 3,
};

const allModes: LayoutMode[] = ['mixed', 'uniform', 'columns', 'rows', 'guillotine', 'contact-sheet'];

function assertBorderGap(packed: PackedImage[], padding: number, canvas = CANVAS) {
  packed.forEach((img) => {
    expect(img.x).toBeGreaterThanOrEqual(padding);
    expect(img.y).toBeGreaterThanOrEqual(padding);
    expect(img.x + img.displayWidth).toBeLessThanOrEqual(canvas.width - padding);
    expect(img.y + img.displayHeight).toBeLessThanOrEqual(canvas.height - padding);
  });
}

/**
 * For every consecutive pair along an axis, when they share a positive overlap on
 * the perpendicular axis, the separation must be exactly `padding`.
 */
function assertExactAxisGaps(packed: PackedImage[], padding: number) {
  const byX = [...packed].sort((a, b) => a.x - b.x || a.y - b.y);
  for (let i = 0; i < byX.length - 1; i++) {
    const a = byX[i];
    const b = byX[i + 1];
    const overlapY = Math.min(a.y + a.displayHeight, b.y + b.displayHeight) - Math.max(a.y, b.y);
    if (overlapY > 0 && a.x + a.displayWidth <= b.x) {
      expect(b.x - (a.x + a.displayWidth)).toBe(padding);
    }
  }

  const byY = [...packed].sort((a, b) => a.y - b.y || a.x - b.x);
  for (let i = 0; i < byY.length - 1; i++) {
    const a = byY[i];
    const b = byY[i + 1];
    const overlapX = Math.min(a.x + a.displayWidth, b.x + b.displayWidth) - Math.max(a.x, b.x);
    if (overlapX > 0 && a.y + a.displayHeight <= b.y) {
      expect(b.y - (a.y + a.displayHeight)).toBe(padding);
    }
  }
}

function facingGap(a: PackedImage, b: PackedImage): number | null {
  const overlapY = Math.min(a.y + a.displayHeight, b.y + b.displayHeight) - Math.max(a.y, b.y);
  if (overlapY > 0) {
    if (a.x + a.displayWidth <= b.x) return b.x - (a.x + a.displayWidth);
    if (b.x + b.displayWidth <= a.x) return a.x - (b.x + b.displayWidth);
  }
  const overlapX = Math.min(a.x + a.displayWidth, b.x + b.displayWidth) - Math.max(a.x, b.x);
  if (overlapX > 0) {
    if (a.y + a.displayHeight <= b.y) return b.y - (a.y + a.displayHeight);
    if (b.y + b.displayHeight <= a.y) return a.y - (b.y + b.displayHeight);
  }
  return null;
}

describe('Contract A: canvas is always the requested size', () => {
  test.each(allModes)('%s: oversized photo is unpacked and canvas stays exact', (mode) => {
    const images = [
      makeImage('huge', 2000, 2000),
      makeImage('a', 100, 80),
      makeImage('b', 120, 90),
    ];

    const result = packImages(images, { ...baseOptions, layoutMode: mode });

    expect(result.canvasSize).toEqual({ width: 800, height: 600 });
    expect(result.unusedImages.map((img) => img.id)).toContain('huge');
    assertBorderGap(result.packedImages, GAP);
  });

  test.each(allModes)('%s: multi-page page canvases stay exact', (mode) => {
    const images = Array.from({ length: 30 }, (_, i) => makeImage(`img-${i}`, 150, 150));

    const result = packImagesMultiPage(
      images,
      { ...baseOptions, layoutMode: mode, columns: 2, rows: 2, useMultiPage: true, maxPages: 4 },
      4
    );

    expect(result.pages).toBeDefined();
    result.pages!.forEach((page) => {
      expect(page.canvasSize).toEqual({ width: 800, height: 600 });
    });
  });

  test('padding 0 never expands the canvas either', () => {
    const images = [makeImage('huge', 2000, 2000), makeImage('a', 100, 100)];
    const result = packImages(images, { ...baseOptions, padding: 0 });
    expect(result.canvasSize).toEqual({ width: 800, height: 600 });
    expect(result.unusedImages.map((img) => img.id)).toContain('huge');
  });
});

describe('Contract B: padding is the exact gap', () => {
  test.each(['mixed', 'guillotine'] as LayoutMode[])('%s: adjacent boxes are exactly padding apart', (mode) => {
    const images = Array.from({ length: 4 }, (_, i) => makeImage(`img-${i}`, 100, 100));

    const result = packImages(images, { ...baseOptions, layoutMode: mode });

    expect(result.packedImages).toHaveLength(4);
    assertBorderGap(result.packedImages, GAP);
    assertExactAxisGaps(result.packedImages, GAP);
  });

  test.each(allModes)('%s: padding 0 makes boxes touch with no artificial gap', (mode) => {
    const images = [makeImage('a', 100, 100), makeImage('b', 100, 100)];
    const result = packImages(images, { ...baseOptions, layoutMode: mode, padding: 0 });

    expect(result.packedImages).toHaveLength(2);
    const [a, b] = result.packedImages;
    expect(a.x).toBeGreaterThanOrEqual(0);
    expect(a.y).toBeGreaterThanOrEqual(0);
    expect(facingGap(a, b)).toBe(0);
  });

  test('columns: gap comes from padding, not canvas division', () => {
    const images = Array.from({ length: 6 }, (_, i) => makeImage(`img-${i}`, 100, 100));
    const result = packImages(images, { ...baseOptions, layoutMode: 'columns', columns: 2 });

    expect(result.packedImages).toHaveLength(6);
    assertBorderGap(result.packedImages, GAP);
    assertExactAxisGaps(result.packedImages, GAP);
    const xs = new Set(result.packedImages.map((img) => img.x));
    expect(xs).toEqual(new Set([GAP, GAP + 100 + GAP]));
  });

  test('rows: gap comes from padding, not canvas division', () => {
    const images = Array.from({ length: 10 }, (_, i) => makeImage(`img-${i}`, 100, 100));
    const result = packImages(images, { ...baseOptions, layoutMode: 'rows', rows: 2 });

    expect(result.packedImages).toHaveLength(10);
    assertBorderGap(result.packedImages, GAP);
    assertExactAxisGaps(result.packedImages, GAP);
    const ys = new Set(result.packedImages.map((img) => img.y));
    expect(ys).toEqual(new Set([GAP, GAP + 100 + GAP]));
  });

  test.each(['uniform', 'contact-sheet'] as LayoutMode[])('%s: uniform cells keep exact gap', (mode) => {
    const images = Array.from({ length: 6 }, (_, i) => makeImage(`img-${i}`, 100, 100));
    const result = packImages(images, { ...baseOptions, layoutMode: mode });

    expect(result.packedImages).toHaveLength(6);
    assertBorderGap(result.packedImages, GAP);
    assertExactAxisGaps(result.packedImages, GAP);
    expect(result.packedImages[0].x).toBe(GAP);
    expect(result.packedImages[0].y).toBe(GAP);
  });

  test('ignores cellPadding as a second gap control', () => {
    const images = Array.from({ length: 4 }, (_, i) => makeImage(`img-${i}`, 100, 100));
    const result = packImages(images, {
      ...baseOptions,
      layoutMode: 'uniform',
      cellPadding: 40,
    });

    expect(result.packedImages[0].x).toBe(GAP);
    assertExactAxisGaps(result.packedImages, GAP);
  });

  test('guillotine: no overlaps on a formerly problematic set', () => {
    const images = [
      makeImage('corner', 100, 100),
      makeImage('wide', 400, 300),
      makeImage('tall', 300, 400),
      makeImage('mid', 200, 200),
      makeImage('small', 80, 80),
    ];
    const result = packImages(images, { ...baseOptions, layoutMode: 'guillotine' });

    assertNoOverlaps(result.packedImages, result.canvasSize.width, result.canvasSize.height);
    assertBorderGap(result.packedImages, GAP);
  });
});

describe('Contract C: stats, efficiency and multi-page correctness', () => {
  test('stats.usedArea sums display areas of packed images', () => {
    const images = [
      makeImage('portrait-a', 100, 200),
      makeImage('portrait-b', 90, 210),
      makeImage('landscape', 220, 120),
    ];
    const result = packImages(images, { ...baseOptions, layoutMode: 'mixed', allowRotation: true });

    const expected = result.packedImages.reduce(
      (sum, img) => sum + img.displayWidth * img.displayHeight,
      0
    );
    expect(result.stats.usedArea).toBe(expected);
    expect(result.stats.canvasArea).toBe(800 * 600);
    expect(result.efficiency).toBeCloseTo((expected / (800 * 600)) * 100, 5);
  });

  test('multi-page result.efficiency equals stats.efficiency (overall)', () => {
    const images = Array.from({ length: 40 }, (_, i) => makeImage(`img-${i}`, 150, 150));
    const result = packImagesMultiPage(
      images,
      { ...baseOptions, layoutMode: 'uniform', maxPages: 4 },
      4
    );

    expect(result.pages!.length).toBeGreaterThan(1);
    expect(result.efficiency).toBeCloseTo(result.stats.efficiency, 5);
    expect(result.stats.usedArea).toBe(
      result.packedImages.reduce((sum, img) => sum + img.displayWidth * img.displayHeight, 0)
    );
  });

  test('maxPages = 1 is honored', () => {
    const images = Array.from({ length: 40 }, (_, i) => makeImage(`img-${i}`, 150, 150));
    const result = packImagesMultiPage(
      images,
      { ...baseOptions, layoutMode: 'uniform', maxPages: 1 },
      1
    );

    expect(result.totalPages).toBe(1);
    expect(result.pages).toHaveLength(1);
    expect(result.packedImages.length + result.unusedImages.length).toBe(images.length);
    expect(result.unusedImages.length).toBeGreaterThan(0);
  });

  test('non-positive dimensions are unpacked, not NaN', () => {
    const images = [
      makeImage('zero', 0, 100),
      makeImage('negative', -50, 50),
      makeImage('ok', 100, 100),
    ];
    const result = packImages(images, { ...baseOptions, layoutMode: 'mixed' });

    expect(result.unusedImages.map((img) => img.id)).toEqual(
      expect.arrayContaining(['zero', 'negative'])
    );
    result.packedImages.forEach((img) => {
      expect(Number.isFinite(img.x)).toBe(true);
      expect(Number.isFinite(img.y)).toBe(true);
      expect(Number.isFinite(img.displayWidth)).toBe(true);
      expect(Number.isFinite(img.displayHeight)).toBe(true);
    });
  });
});
