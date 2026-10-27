import { vi, beforeAll, afterAll } from 'vitest';

// Global DOM mock for tests that use downloadPackedCanvas
beforeAll(() => {
  // jsdom already provides document and Image, we just need to ensure they work
  const OriginalImage = (globalThis as any).Image;
  (globalThis as any).Image = class {
    onload: (() => void) | null = null;
    src: string = '';
    naturalWidth = 100;
    naturalHeight = 100;
    
    constructor() {
      setTimeout(() => this.onload?.(), 0);
    }
  } as unknown as typeof OriginalImage;
  
  // Mock canvas and anchor creation
  const originalCreateElement = document.createElement.bind(document);
  document.createElement = ((tag: string) => {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: () => ({
          fillStyle: '',
          fillRect: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          translate: vi.fn(),
          rotate: vi.fn(),
          drawImage: vi.fn(),
        }),
        toDataURL: () => 'data:image/png;base64,test',
      } as unknown as HTMLCanvasElement;
    }
    if (tag === 'a') {
      return {
        download: '',
        href: '',
        click: vi.fn(),
      } as unknown as HTMLAnchorElement;
    }
    return originalCreateElement(tag);
  }) as typeof document.createElement;
});

afterAll(() => {
  // No need to clean up, jsdom handles it
});