import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Ensure ImageData is available in test environment
if (typeof ImageData === 'undefined') {
  // @ts-ignore - Polyfill for Node.js test environment
  global.ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;

    constructor(widthOrData: number | Uint8ClampedArray, height?: number) {
      if (typeof widthOrData === 'number') {
        this.width = widthOrData;
        this.height = height || widthOrData;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        this.data = widthOrData;
        this.width = height || 1;
        this.height = widthOrData.length / (4 * (height || 1));
      }
    }
  };
}

// Polyfill requestIdleCallback for test environment
// In tests, execute immediately to avoid async timing issues
if (typeof requestIdleCallback === 'undefined') {
  // @ts-ignore
  global.requestIdleCallback = (callback: IdleRequestCallback, options?: IdleRequestOptions) => {
    // Execute immediately in test environment for synchronous testing
    callback({
      didTimeout: false,
      timeRemaining: () => 50, // Simulate 50ms remaining
    });
    return 1 as unknown as number; // Return a mock ID
  };
  // @ts-ignore
  global.cancelIdleCallback = (id: number) => {
    // No-op in test environment
  };
}

// Store image data in mock context to simulate actual canvas behavior
let storedImageData: ImageData | null = null;

// Mock canvas for testing
const mockContext = {
  fillRect: vi.fn(),
  clearRect: vi.fn((_x?: number, _y?: number, _width?: number, _height?: number) => {
    // Clear the stored image data (set all pixels to transparent)
    if (storedImageData) {
      const data = new Uint8ClampedArray(storedImageData.width * storedImageData.height * 4);
      storedImageData = new ImageData(data, storedImageData.width, storedImageData.height);
    } else {
      // Initialize with transparent data
      const data = new Uint8ClampedArray(512 * 512 * 4);
      storedImageData = new ImageData(data, 512, 512);
    }
  }),
  getImageData: vi.fn((_sx?: number, _sy?: number, _sw?: number, _sh?: number) => {
    if (storedImageData) {
      // Return a copy of stored data
      const data = new Uint8ClampedArray(storedImageData.data);
      return new ImageData(data, storedImageData.width, storedImageData.height);
    }
    const data = new Uint8ClampedArray(512 * 512 * 4);
    return new ImageData(data, 512, 512);
  }),
  putImageData: vi.fn((imageData: ImageData, _dx?: number, _dy?: number) => {
    // Store the image data
    const data = new Uint8ClampedArray(imageData.data);
    storedImageData = new ImageData(data, imageData.width, imageData.height);
  }),
  createImageData: vi.fn((width: number, height?: number) => {
    const data = new Uint8ClampedArray((width || 1) * (height || width || 1) * 4);
    return new ImageData(data, width || 1, height || width || 1);
  }),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalCompositeOperation: 'source-over',
} as unknown as CanvasRenderingContext2D;

HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
  if (contextId === '2d') {
    // Reset stored image data for each test
    storedImageData = null;
    return mockContext;
  }
  return null;
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;
