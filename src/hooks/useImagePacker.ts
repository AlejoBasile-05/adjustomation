import { useState, useCallback, useEffect } from 'react';
import type { ImageFile, PackingOptions, PackingResult, CanvasSize, SortingStrategy } from '../types';
import { createImageFile, packImages, calculateOptimalCanvasSize } from '../utils/packing';

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
  runPacking: () => Promise<void>;
  resetPacking: () => void;
  downloadResult: () => void;
}

export function useImagePacker(): UseImagePackerReturn {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [canvasSize, setCanvasSizeState] = useState<CanvasSize>({ width: 800, height: 600 });
  const [options, setOptions] = useState<PackingOptions>({
    canvasSize: { width: 800, height: 600 },
    allowRotation: true,
    padding: 4,
    sortingStrategy: 'area-desc',
  });
  const [result, setResult] = useState<PackingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    try {
      const newImages = await Promise.all(validFiles.map(createImageFile));
      setImages(prev => [...prev, ...newImages]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las imágenes');
    }
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
    setResult(null);
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
    setResult(null);
  }, []);

  const setCanvasSize = useCallback((size: CanvasSize) => {
    setCanvasSizeState(size);
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

  const downloadResult = useCallback(() => {
    if (!result || result.packedImages.length === 0) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = result.canvasSize.width;
    canvas.height = result.canvasSize.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, result.canvasSize.width, result.canvasSize.height);

    // Draw each packed image
    const drawPromises = result.packedImages.map(packedImg => {
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
  }, [result]);

  // Auto-calculate optimal canvas size when images change
  useEffect(() => {
    if (images.length > 0 && !result) {
      const optimal = calculateOptimalCanvasSize(images);
      setCanvasSizeState(optimal);
    }
  }, [images, result]);

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
    runPacking,
    resetPacking,
    downloadResult,
  };
}