import { useState, useCallback, useEffect, useRef } from 'react';
import { UnitType, convertCanvasSize, MIN_CANVAS_PX, MAX_CANVAS_PX, revokeImageFileURLs } from '../utils/packing';
import type { ImageFile, PackingOptions, PackingResult, CanvasSize, SortingStrategy, LayoutMode } from '../types';
import { createImageFile, packImages, calculateOptimalCanvasSize } from '../utils/packing';
import { drawPackedCanvas } from '../utils/packing/export';

export const MAX_IMAGES = 50;

interface UseImagePackerReturn {
  // State
  images: ImageFile[];
  canvasSize: CanvasSize;
  options: PackingOptions;
  result: PackingResult | null;
  isProcessing: boolean;
  error: string | null;
  
  // Actions
  addImages: (files: File[]) => Promise<void>;
  removeImage: (id: string) => void;
  clearImages: () => void;
  setCanvasSize: (size: CanvasSize) => void;
  setOption: <K extends keyof PackingOptions>(key: K, value: PackingOptions[K]) => void;
  setSortingStrategy: (strategy: SortingStrategy) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  runPacking: () => Promise<void>;
  resetPacking: () => void;
  downloadResult: () => void;
  dismissError: () => void;
  setUnit: (unit: UnitType) => void;
}

// Helper to get initial unit from localStorage
function getInitialUnit(): UnitType {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('packimg-unit');
    if (stored === 'px' || stored === 'cm') {
      return stored;
    }
  }
  return 'px';
}

// Helper to save unit to localStorage
function saveUnitToStorage(unit: UnitType): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('packimg-unit', unit);
  }
}

export function useImagePacker(): UseImagePackerReturn {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [canvasSize, setCanvasSizeState] = useState<CanvasSize>({ width: 800, height: 600 });
  const [options, setOptions] = useState<PackingOptions>({
    unit: getInitialUnit(),
    canvasSize: { width: 800, height: 600 },
    allowRotation: true,
    padding: 4,
    sortingStrategy: 'area-desc',
    layoutMode: 'mixed',
    columns: 4,
    rows: 3,
    cellPadding: 4,
    fitMode: 'contain',
  });
  const [result, setResult] = useState<PackingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mirror of `images` so async callbacks can read the current count without
  // re-creating themselves (and re-triggering every memoized child).
  const imagesRef = useRef<ImageFile[]>([]);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // Sync canvasSize with options
  useEffect(() => {
    setOptions(prev => ({ ...prev, canvasSize }));
  }, [canvasSize]);

  const addImages = useCallback(async (files: File[]) => {
    setError(null);
    const validFiles = files.filter(f => f.type.startsWith('image/'));

    if (validFiles.length === 0) {
      setError('No se seleccionaron archivos de imagen válidos');
      return;
    }

    const room = MAX_IMAGES - imagesRef.current.length;
    if (room <= 0) {
      setError(`Límite alcanzado: máximo ${MAX_IMAGES} imágenes por empaquetado`);
      return;
    }

    try {
      const newImages = await Promise.all(validFiles.map(createImageFile));
      const accepted = newImages.slice(0, room);
      setImages(prev => [...prev, ...accepted]);

      if (accepted.length < newImages.length) {
        setError(
          `Se añadieron ${accepted.length} de ${newImages.length} imágenes: el límite es ${MAX_IMAGES}`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las imágenes');
    }
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const removed = prev.filter(img => img.id === id);
      const remaining = prev.filter(img => img.id !== id);
      if (removed.length > 0) {
        revokeImageFileURLs(removed);
      }
      return remaining;
    });
    setResult(null);
  }, []);

  const clearImages = useCallback(() => {
    setImages(prev => {
      if (prev.length > 0) {
        revokeImageFileURLs(prev);
      }
      return [];
    });
    setResult(null);
  }, []);

  const setCanvasSize = useCallback((size: CanvasSize) => {
    // Clamp values to valid range
    const clampedSize: CanvasSize = {
      width: Math.max(MIN_CANVAS_PX, Math.min(MAX_CANVAS_PX, size.width)),
      height: Math.max(MIN_CANVAS_PX, Math.min(MAX_CANVAS_PX, size.height)),
    };
    setCanvasSizeState(clampedSize);
    setResult(null);
  }, []);

  const setOption = useCallback(<K extends keyof PackingOptions>(key: K, value: PackingOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
    setResult(null);
  }, []);

  const setSortingStrategy = useCallback((strategy: SortingStrategy) => {
    setOptions(prev => ({ ...prev, sortingStrategy: strategy }));
    setResult(null);
  }, []);

  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setOptions(prev => ({ ...prev, layoutMode: mode }));
    setResult(null);
  }, []);

  const runPacking = useCallback(async () => {
    if (images.length === 0) {
      setError('No hay imágenes para empaquetar');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Use a small timeout to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const packingResult = packImages(images, options);
      setResult(packingResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error durante el empaquetado');
    } finally {
      setIsProcessing(false);
    }
  }, [images, options]);

  const resetPacking = useCallback(() => {
    setResult(null);
  }, []);

const downloadResult = useCallback(async () => {
    if (!result || result.packedImages.length === 0) return;

    try {
      const dataUrl = await drawPackedCanvas(
        result.packedImages,
        result.canvasSize,
        '#ffffff'
      );

      const link = document.createElement('a');
      link.download = `packed-images-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Download error:', error);
      setError(error instanceof Error ? `Error generating packed image: ${error.message}` : 'Error generating packed image');
    }
  }, [result]);

  const setUnit = useCallback((unit: UnitType) => {
    const currentUnit = options.unit || 'px';
    const newCanvasSize = convertCanvasSize(canvasSize, currentUnit, unit);

    setCanvasSizeState(newCanvasSize);
    setOptions(prev => ({ ...prev, unit }));
    setResult(null);
    saveUnitToStorage(unit);
  }, [canvasSize, options.unit]);

  // Auto-calculate the optimal canvas size when the image *set* changes.
  // Keyed on the set signature (not on `result`), so a manual size edit or a pack
  // cycle is never silently overwritten.
  const autoSizedSignature = useRef<string | null>(null);
  useEffect(() => {
    if (images.length === 0) {
      autoSizedSignature.current = null;
      return;
    }

    const signature = images.map(img => img.id).join('|');
    if (autoSizedSignature.current === signature) return;

    autoSizedSignature.current = signature;
    setCanvasSizeState(calculateOptimalCanvasSize(images));
  }, [images]);

  return {
    images,
    canvasSize,
    options,
    result,
    isProcessing,
    error,
    addImages,
    removeImage,
    clearImages,
    setCanvasSize,
    setOption,
    setSortingStrategy,
    setLayoutMode,
    runPacking,
    resetPacking,
    downloadResult,
    setUnit,
    dismissError,
  };
}